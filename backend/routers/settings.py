from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from auth import get_current_user, check_permission, get_password_hash
from models import User, Settings
from schemas import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/", response_model=SettingsResponse)
async def get_settings(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    settings = db.query(Settings).filter(Settings.user_id == current_user.id).first()
    if not settings:
        # Create default settings if not exist
        settings = Settings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/", response_model=SettingsResponse)
async def update_settings(
        settings_update: SettingsUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    settings = db.query(Settings).filter(Settings.user_id == current_user.id).first()
    if not settings:
        settings = Settings(user_id=current_user.id)
        db.add(settings)

    # Update password if provided
    if settings_update.password:
        current_user.password_hash = get_password_hash(settings_update.password)
        db.add(current_user)

    update_data = settings_update.dict(exclude_unset=True, exclude={"password"})

    for field, value in update_data.items():
        if value is not None:
            setattr(settings, field, value)

    # Also update user fields
    if settings_update.email:
        current_user.email = settings_update.email

    if settings_update.phone_number:
        current_user.phone_number = settings_update.phone_number

    if settings_update.allowed_ips:
        current_user.allowed_ips = settings_update.allowed_ips

    current_user.updated_at = datetime.utcnow()

    db.add(current_user)
    db.add(settings)
    db.commit()
    db.refresh(settings)

    return settings


@router.get("/profile", response_model=dict)
async def get_profile(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    settings = db.query(Settings).filter(Settings.user_id == current_user.id).first()

    return {
        "username": current_user.username,
        "role": current_user.role.value,
        "email": current_user.email,
        "phone_number": current_user.phone_number or "",
        "status": current_user.status.value,
        "first_name": settings.first_name if settings else "",
        "last_name": settings.last_name if settings else "",
        "allowed_ips": current_user.allowed_ips,
        "last_login_ip": current_user.last_login_ip or ""
    }