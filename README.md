# Pet Adoption Website - PetMatch

## Setup

### 1. Database (MySQL)
- Database name: `demo`
- Run `database/schema.sql` in MySQL (optional - Spring Boot creates tables and admin user automatically)

### 2. Backend (Spring Boot)
```bash
cd backend
mvn spring-boot:run
```
Runs on http://localhost:8080

### 3. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Adopter | test@example.com | test123 |
| Admin | admin@petmatch.com | admin123 |

Admin account is auto-created on first backend startup.

## Pages
- **Home** (/) - Hero slider, action buttons (Volunteer, Adopter, Seller, Pet Breed)
- **Volunteer Form** (/volunteer) - Pet registration (requires login)
- **Admin Dashboard** (/admin) - View all pet registrations, edit, delete (Admin only)
- **Login/Register** (/login, /register)

## Pet Registration Flow
1. Sign in (or create account with Volunteer/Shelter role)
2. Click Volunteer/Shelter on home page
3. Fill form: type, category, breed, age, health, behavior tags, photos (3-4), contact info
4. Images are saved in backend `uploads/` folder, paths stored in database
