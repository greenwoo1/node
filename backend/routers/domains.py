from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import dns.resolver
from datetime import datetime

from database import get_db
from auth import get_current_user, check_permission
from models import User, Domain, History
from schemas import DomainCreate, DomainUpdate, DomainResponse

router = APIRouter(prefix="/api/domains", tags=["domains"])


def get_dns_records(domain: str):
    try:
        # Get NS records
        ns_records = []
        try:
            answers = dns.resolver.resolve(domain, 'NS')
            ns_records = [str(r.target) for r in answers]
        except:
            pass

        # Get A records
        a_records = []
        try:
            answers = dns.resolver.resolve(domain, 'A')
            a_records = [str(r.address) for r in answers]
        except:
            pass

        # Get AAAA records
        aaaa_records = []
        try:
            answers = dns.resolver.resolve(domain, 'AAAA')
            aaaa_records = [str(r.address) for r in answers]
        except:
            pass

        return ns_records, a_records, aaaa_records
    except Exception:
        return [], [], []


@router.get("/", response_model=List[DomainResponse])
async def get_domains(
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    query = db.query(Domain)

    if search:
        search = f"%{search}%"
        query = query.filter(
            (Domain.domain_name.ilike(search)) |
            (Domain.group_id.cast(str).like(search))
        )

    domains = query.offset(skip).limit(limit).all()

    # Update DNS records for domains
    for domain in domains:
        if not domain.ns_records or not domain.a_records:
            ns, a, aaaa = get_dns_records(domain.domain_name)
            domain.ns_records = ns
            domain.a_records = a
            domain.aaaa_records = aaaa
            db.add(domain)

    db.commit()

    return domains


@router.post("/", response_model=DomainResponse)
async def create_domain(
        domain: DomainCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 2L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Check if domain exists
    existing = db.query(Domain).filter(Domain.domain_name == domain.domain_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Domain already exists")

    # Get DNS records
    ns_records, a_records, aaaa_records = get_dns_records(domain.domain_name)

    db_domain = Domain(
        **domain.dict(),
        ns_records=ns_records,
        a_records=a_records,
        aaaa_records=aaaa_records,
        created_by=current_user.id,
        updated_by=current_user.id
    )

    db.add(db_domain)
    db.commit()
    db.refresh(db_domain)

    # Log history
    history = History(
        action="CREATE",
        table_name="domains",
        record_id=db_domain.id,
        changes={"all": "created"},
        user_id=current_user.id,
        domain_id=db_domain.id
    )
    db.add(history)
    db.commit()

    return db_domain


@router.put("/{domain_id}", response_model=DomainResponse)
async def update_domain(
        domain_id: int,
        domain_update: DomainUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 1L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db_domain = db.query(Domain).filter(Domain.id == domain_id).first()
    if not db_domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    changes = {}
    update_data = domain_update.dict(exclude_unset=True)

    for field, new_value in update_data.items():
        old_value = getattr(db_domain, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
            setattr(db_domain, field, new_value)

    db_domain.updated_by = current_user.id
    db_domain.updated_at = datetime.utcnow()

    # Update DNS records if domain name changed
    if "domain_name" in update_data:
        ns, a, aaaa = get_dns_records(db_domain.domain_name)
        db_domain.ns_records = ns
        db_domain.a_records = a
        db_domain.aaaa_records = aaaa

    db.add(db_domain)
    db.commit()
    db.refresh(db_domain)

    # Log history
    if changes:
        history = History(
            action="UPDATE",
            table_name="domains",
            record_id=domain_id,
            changes=changes,
            user_id=current_user.id,
            domain_id=domain_id
        )
        db.add(history)
        db.commit()

    return db_domain


@router.get("/{domain_id}/history")
async def get_domain_history(
        domain_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not check_permission(current_user, "Admin 1L"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    history = db.query(History).filter(
        History.domain_id == domain_id
    ).order_by(History.timestamp.desc()).all()

    return history