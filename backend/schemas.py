from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# Enums matching SQLAlchemy models
class UserRole(str, Enum):
    SUPER_ADMIN = "Super Admin"
    ADMIN_2L = "Admin 2L"
    ADMIN_1L = "Admin 1L"
    SERVICE_MANAGER = "Service Manager"


class UserStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class ServerStatus(str, Enum):
    RUNNING = "running"
    STOPPED = "stoped"
    RESERV = "reserv"
    ABUSE = "abuse"
    MAINTENANCE = "maintaince"


class DomainStatus(str, Enum):
    ACTIVE = "Active"
    SUSPENDED = "Suspended"
    ABUSE = "Abuse"
    MAINTENANCE = "Maintance"


class AccountStatus(str, Enum):
    ACTIVE = "Active"
    DEACTIVATED = "Deactivated"


class GroupStatus(str, Enum):
    ENABLED = "Enabled"
    DISABLED = "Disabled"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    UAH = "UAH"


# Base schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    phone_number: Optional[str] = None
    role: UserRole = UserRole.ADMIN_1L
    status: UserStatus = UserStatus.ACTIVE
    allowed_ips: List[str] = ["0.0.0.0/0"]


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = None
    allowed_ips: Optional[List[str]] = None


class UserResponse(UserBase):
    id: int
    last_login_ip: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Server schemas
class ServerBase(BaseModel):
    os: Optional[str] = None
    ip_address: str
    additional_ips: Optional[str] = None
    comments: Optional[str] = None
    hoster: Optional[str] = None
    status: ServerStatus = ServerStatus.RUNNING
    group_id: Optional[int] = None
    project: Optional[str] = None
    country: Optional[str] = None
    ssh_username: str = "root"
    ssh_password: str
    ssh_port: int = 22
    container_password: Optional[str] = None


class ServerCreate(ServerBase):
    pass


class ServerUpdate(BaseModel):
    os: Optional[str] = None
    ip_address: Optional[str] = None
    additional_ips: Optional[str] = None
    comments: Optional[str] = None
    hoster: Optional[str] = None
    status: Optional[ServerStatus] = None
    group_id: Optional[int] = None
    project: Optional[str] = None
    country: Optional[str] = None
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    ssh_port: Optional[int] = None
    container_password: Optional[str] = None


class ServerResponse(ServerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


# Domain schemas
class DomainBase(BaseModel):
    domain_name: str
    group_id: Optional[int] = None
    status: DomainStatus = DomainStatus.ACTIVE


class DomainCreate(DomainBase):
    pass


class DomainUpdate(BaseModel):
    domain_name: Optional[str] = None
    group_id: Optional[int] = None
    status: Optional[DomainStatus] = None


class DomainResponse(DomainBase):
    id: int
    ns_records: Optional[List[str]] = None
    a_records: Optional[List[str]] = None
    aaaa_records: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


# Group schemas
class GroupBase(BaseModel):
    title: str
    projects: List[str] = []
    status: GroupStatus = GroupStatus.ENABLED
    description: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    title: Optional[str] = None
    projects: Optional[List[str]] = None
    status: Optional[GroupStatus] = None
    description: Optional[str] = None


class GroupResponse(GroupBase):
    id: int
    assigned_servers: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Finance schemas
class FinanceBase(BaseModel):
    server_id: int
    account_status: AccountStatus = AccountStatus.ACTIVE
    price: float
    currency: Currency = Currency.USD
    payment_date: datetime
    group_id: Optional[int] = None


class FinanceCreate(FinanceBase):
    pass


class FinanceUpdate(BaseModel):
    account_status: Optional[AccountStatus] = None
    price: Optional[float] = None
    currency: Optional[Currency] = None
    payment_date: Optional[datetime] = None
    group_id: Optional[int] = None


class FinanceResponse(FinanceBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Settings schemas
class SettingsBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    allowed_ips: List[str] = ["0.0.0.0/0"]


class SettingsUpdate(SettingsBase):
    password: Optional[str] = None


class SettingsResponse(SettingsBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# History schemas
class HistoryBase(BaseModel):
    action: str
    table_name: str
    record_id: int
    changes: Dict[str, Any]
    timestamp: datetime


class HistoryResponse(HistoryBase):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None

    class Config:
        from_attributes = True


# Login schema
class LoginRequest(BaseModel):
    username: str
    password: str


# Search schemas
class SearchRequest(BaseModel):
    query: Optional[str] = None
    field: Optional[str] = None
    page: int = 1
    limit: int = 50