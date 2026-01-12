from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database import get_db
from auth import get_current_user, check_permission, get_password_hash
from models import User, UserRole, UserStatus, History
from schemas import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=List[UserResponse])
async def get_users(
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = db.query(User)

    if search:
        search = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search)) |
            (User.email.ilike(search)) |
            (User.phone_number.ilike(search)) |
            (User.role.ilike(search))
        )

    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=UserResponse)
async def create_user(
        user: UserCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Check if user exists
    existing = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    hashed_password = get_password_hash(user.password)

    db_user = User(
        username=user.username,
        email=user.email,
        phone_number=user.phone_number,
        password_hash=hashed_password,
        role=user.role,
        status=user.status,
        allowed_ips=user.allowed_ips
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Log history
    history = History(
        action="CREATE",
        table_name="users",
        record_id=db_user.id,
        changes={"all": "created"},
        user_id=current_user.id
    )
    db.add(history)
    db.commit()

    return db_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
        user_id: int,
        user_update: UserUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    # Check permissions - Admin 2L can update anyone, others can only update themselves
    if current_user.id != user_id and not check_permission(current_user, "Admin 2L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Super Admin cannot be demoted
    if db_user.role == UserRole.SUPER_ADMIN and user_update.role and user_update.role != UserRole.SUPER_ADMIN:
        if current_user.id != db_user.id:
            raise HTTPException(status_code=403, detail="Cannot demote Super Admin")

    changes = {}
    update_data = user_update.dict(exclude_unset=True)

    # Handle password update
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))

    for field, new_value in update_data.items():
        old_value = getattr(db_user, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
            setattr(db_user, field, new_value)

    db_user.updated_at = datetime.utcnow()

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Log history
    if changes:
        history = History(
            action="UPDATE",
            table_name="users",
            record_id=user_id,
            changes=changes,
            user_id=current_user.id
        )
        db.add(history)
        db.commit()

    return db_user


@router.delete("/{user_id}")
async def delete_user(
        user_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot delete Super Admin
    if db_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete Super Admin")

    # Cannot delete yourself
    if db_user.id == current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete yourself")

    db.delete(db_user)
    db.commit()

    # Log history
    history = History(
        action="DELETE",
        table_name="users",
        record_id=user_id,
        changes={"all": "deleted"},
        user_id=current_user.id
    )
    db.add(history)
    db.commit()

    return {"message": "User deleted successfully"}