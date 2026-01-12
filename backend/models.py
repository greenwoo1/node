from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "Super Admin"
    ADMIN_2L = "Admin 2L"
    ADMIN_1L = "Admin 1L"
    SERVICE_MANAGER = "Service Manager"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class ServerStatus(str, enum.Enum):
    RUNNING = "running"
    STOPPED = "stoped"
    RESERV = "reserv"
    ABUSE = "abuse"
    MAINTENANCE = "maintaince"


class DomainStatus(str, enum.Enum):
    ACTIVE = "Active"
    SUSPENDED = "Suspended"
    ABUSE = "Abuse"
    MAINTENANCE = "Maintance"


class AccountStatus(str, enum.Enum):
    ACTIVE = "Active"
    DEACTIVATED = "Deactivated"


class GroupStatus(str, enum.Enum):
    ENABLED = "Enabled"
    DISABLED = "Disabled"


class Currency(str, enum.Enum):
    USD = "USD"
    EUR = "EUR"
    UAH = "UAH"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone_number = Column(String(20))
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.ADMIN_1L)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE)
    last_login_ip = Column(String(45))
    allowed_ips = Column(JSON, default=["0.0.0.0/0"])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    history_entries = relationship("History", back_populates="user")
    servers_created = relationship("Server", foreign_keys="[Server.created_by]")
    servers_updated = relationship("Server", foreign_keys="[Server.updated_by]")


class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    os = Column(String(100))
    ip_address = Column(String(45), nullable=False)
    additional_ips = Column(Text)
    comments = Column(Text)
    hoster = Column(String(100))
    status = Column(SQLEnum(ServerStatus), default=ServerStatus.RUNNING)
    group_id = Column(Integer, ForeignKey("groups.id"))
    project = Column(String(100))
    country = Column(String(2))

    # Connection details
    ssh_username = Column(String(50), default="root")
    ssh_password = Column(String(255))
    ssh_port = Column(Integer, default=22)
    container_password = Column(String(255))

    # Timestamps and user tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    group = relationship("Group", back_populates="servers")
    finance_accounts = relationship("Finance", back_populates="server")
    history_entries = relationship("History", back_populates="server")

    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])


class Domain(Base):
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    domain_name = Column(String(255), unique=True, nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"))
    status = Column(SQLEnum(DomainStatus), default=DomainStatus.ACTIVE)
    ns_records = Column(JSON)
    a_records = Column(JSON)
    aaaa_records = Column(JSON)

    # Timestamps and user tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    group = relationship("Group", back_populates="domains")
    history_entries = relationship("History", back_populates="domain")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    projects = Column(JSON, default=list)  # List of project names
    status = Column(SQLEnum(GroupStatus), default=GroupStatus.ENABLED)
    description = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    servers = relationship("Server", back_populates="group")
    domains = relationship("Domain", back_populates="group")
    finance_accounts = relationship("Finance", back_populates="group")


class Finance(Base):
    __tablename__ = "finance"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"))
    account_status = Column(SQLEnum(AccountStatus), default=AccountStatus.ACTIVE)
    price = Column(Float)
    currency = Column(SQLEnum(Currency), default=Currency.USD)
    payment_date = Column(DateTime(timezone=True))
    group_id = Column(Integer, ForeignKey("groups.id"))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    server = relationship("Server", back_populates="finance_accounts")
    group = relationship("Group", back_populates="finance_accounts")
    history_entries = relationship("History", back_populates="finance")


class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE
    table_name = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=False)
    changes = Column(JSON)  # {"field": {"old": value, "new": value}}
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationships to specific tables
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=True)
    finance_id = Column(Integer, ForeignKey("finance.id"), nullable=True)

    user = relationship("User", back_populates="history_entries")
    server = relationship("Server", back_populates="history_entries")
    domain = relationship("Domain", back_populates="history_entries")
    finance = relationship("Finance", back_populates="history_entries")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    first_name = Column(String(50))
    last_name = Column(String(50))
    email = Column(String(100))
    phone_number = Column(String(20))
    allowed_ips = Column(JSON, default=["0.0.0.0/0"])

    user = relationship("User")