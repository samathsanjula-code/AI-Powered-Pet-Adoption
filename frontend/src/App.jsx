import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import VolunteerFormPage from './pages/VolunteerFormPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import SellerPage from './pages/SellerPage'
import SellerCartPage from './pages/SellerCartPage'
import SellerOrdersPage from './pages/SellerOrdersPage'
import SellerAdminDashboardPage from './pages/SellerAdminDashboardPage'
import PetSearchPage from './pages/PetSearchPage'
import PetSearchOptionsPage from './pages/PetSearchOptionsPage'
import AiRecommendationPage from './pages/AiRecommendationPage'
import AdoptionFormPage from './pages/AdoptionFormPage'
import AdoptionAdminDashboardPage from './pages/AdoptionAdminDashboardPage'
import BreedIdentificationPage from './pages/BreedIdentificationPage'
import BreedIdentificationOptionsPage from './pages/BreedIdentificationOptionsPage'
import BreedIdentificationAiPage from './pages/BreedIdentificationAiPage'
import BreedIdentificationAdminPage from './pages/BreedIdentificationAdminPage'
import PlaceholderPage from './pages/PlaceholderPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import UserManagementAdminPage from './pages/UserManagementAdminPage'
import PromptsAdminPage from './pages/PromptsAdminPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/admin-login" element={<AuthPage adminOnly />} />
        <Route path="/pet-admin-login" element={<AuthPage adminOnly allowedRoles={['PetAdmin']} adminRedirectPath="/admin" />} />
        <Route path="/register" element={<AuthPage initialTab="register" />} />
        <Route path="/forgot" element={<ForgotPasswordPage />} />
        <Route path="/volunteer" element={
          <ProtectedRoute>
            <VolunteerFormPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute requirePetAdmin>
            <AdminDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/user-management" element={
          <ProtectedRoute requireAdmin>
            <UserManagementAdminPage />
          </ProtectedRoute>
        } />
        <Route path="/prompts" element={
          <ProtectedRoute requireAdmin>
            <PromptsAdminPage />
          </ProtectedRoute>
        } />
        <Route path="/pet-search" element={<PetSearchOptionsPage />} />
        <Route path="/pet-search/browse" element={<PetSearchPage />} />
        <Route path="/pet-search/ai-recommendation" element={<AiRecommendationPage />} />
        <Route path="/adoption-form" element={<AdoptionFormPage />} />
        <Route path="/adoption-admin" element={
          <ProtectedRoute requireAdoptionAdmin>
            <AdoptionAdminDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/seller" element={<SellerPage />} />
        <Route path="/seller/cart" element={
          <ProtectedRoute>
            <SellerCartPage />
          </ProtectedRoute>
        } />
        <Route path="/seller/orders" element={
          <ProtectedRoute>
            <SellerOrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/seller-admin" element={
          <ProtectedRoute requireSellerAdmin>
            <SellerAdminDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/breed-identification" element={<BreedIdentificationOptionsPage />} />
        <Route path="/breed-identification/admin-support" element={<BreedIdentificationPage />} />
        <Route path="/breed-identification/ai" element={<BreedIdentificationAiPage />} />
        <Route path="/breed-identification/admin" element={
          <ProtectedRoute requirePetAdmin>
            <BreedIdentificationAdminPage />
          </ProtectedRoute>
        } />
        <Route path="/checklist" element={<PlaceholderPage title="Adoption Checklist" />} />
        <Route path="/faq" element={<PlaceholderPage title="Pet Adoption FAQs" />} />
        <Route path="/articles" element={<PlaceholderPage title="Adoption Articles" />} />
        <Route path="/privacy" element={<PlaceholderPage title="Privacy Policy" />} />
        <Route path="/terms" element={<PlaceholderPage title="Terms of Service" />} />
        <Route path="/contact" element={<PlaceholderPage title="Contact" />} />

          <Route path="/profile" element={
              <ProtectedRoute>
                  <ProfilePage />
              </ProtectedRoute>
          } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
