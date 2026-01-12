from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import timedelta
import os
from dotenv import load_dotenv

from database import engine, get_db, Base
from auth import authenticate_user, create_access_token, get_current_user, get_password_hash
from models import User, UserRole
from schemas import LoginRequest, Token
import routers.servers
import routers.domains
import routers.users
import routers.finance
import routers.groups
import routers.settings

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ControlNode API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routers.servers.router)
app.include_router(routers.domains.router)
app.include_router(routers.users.router)
app.include_router(routers.finance.router)
app.include_router(routers.groups.router)
app.include_router(routers.settings.router)

security = HTTPBearer()


@app.post("/api/login", response_model=Token)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/check-auth")
async def check_auth(current_user: User = Depends(get_current_user)):
    return {
        "authenticated": True,
        "username": current_user.username,
        "role": current_user.role.value
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


# Create super admin on startup
@app.on_event("startup")
async def startup_event():
    db = next(get_db())
    try:
        # Check if super admin exists
        super_admin = db.query(User).filter(User.username == "superadmin").first()
        if not super_admin:
            # Create super admin
            super_admin = User(
                username="superadmin",
                email="admin@controlnode.com",
                phone_number="+380991234567",
                password_hash=get_password_hash("Admin123!"),
                role=UserRole.SUPER_ADMIN,
                status="active"
            )
            db.add(super_admin)
            db.commit()
            print("Super Admin created successfully")
        else:
            print("Super Admin already exists")
    except Exception as e:
        print(f"Error creating super admin: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)