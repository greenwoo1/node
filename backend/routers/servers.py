from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database import get_db
from auth import get_current_user, check_permission
from models import User, Server, ServerStatus, History
from schemas import ServerCreate, ServerUpdate, ServerResponse, SearchRequest

router = APIRouter(prefix="/api/servers", tags=["servers"])


@router.get("/", response_model=List[ServerResponse])
async def get_servers(
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    query = db.query(Server)

    if search:
        search = f"%{search}%"
        query = query.filter(
            (Server.id.cast(str).like(search)) |
            (Server.project.ilike(search)) |
            (Server.ip_address.ilike(search)) |
            (Server.comments.ilike(search))
        )

    return query.offset(skip).limit(limit).all()


@router.get("/{server_id}", response_model=ServerResponse)
async def get_server(
        server_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.post("/", response_model=ServerResponse)
async def create_server(
        server: ServerCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db_server = Server(
        **server.dict(),
        created_by=current_user.id,
        updated_by=current_user.id
    )

    db.add(db_server)
    db.commit()
    db.refresh(db_server)

    # Log history
    history = History(
        action="CREATE",
        table_name="servers",
        record_id=db_server.id,
        changes={"all": "created"},
        user_id=current_user.id,
        server_id=db_server.id
    )
    db.add(history)
    db.commit()

    return db_server


@router.put("/{server_id}", response_model=ServerResponse)
async def update_server(
        server_id: int,
        server_update: ServerUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 1L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db_server = db.query(Server).filter(Server.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Track changes for history
    changes = {}
    update_data = server_update.dict(exclude_unset=True)

    for field, new_value in update_data.items():
        old_value = getattr(db_server, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
            setattr(db_server, field, new_value)

    db_server.updated_by = current_user.id
    db_server.updated_at = datetime.utcnow()

    db.add(db_server)
    db.commit()
    db.refresh(db_server)

    # Log history if changes were made
    if changes:
        history = History(
            action="UPDATE",
            table_name="servers",
            record_id=server_id,
            changes=changes,
            user_id=current_user.id,
            server_id=server_id
        )
        db.add(history)
        db.commit()

    return db_server


@router.get("/{server_id}/history")
async def get_server_history(
        server_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 1L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    history = db.query(History).filter(
        History.server_id == server_id
    ).order_by(History.timestamp.desc()).all()

    return history