import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import EditProfile from '../pages/therapist/EditProfile';
import Dashboard from '../pages/therapist/Dashboard';
import Schedule from '../pages/therapist/Schedule';
import Clients from '../pages/therapist/Clients';
import ClientDetail from '../pages/therapist/ClientDetail';
import BookingPage from '../pages/client/BookingPage';
import Payment from '../pages/client/Payment';
import Notes from '../pages/therapist/Notes';
import NotesIndex from '../pages/therapist/NotesIndex';
import Analytics from '../pages/therapist/Analytics';
import Messages from '../pages/therapist/Messages';
import Packages from '../pages/therapist/Packages';
import Plans from '../pages/therapist/Plans';
import PublicProfile from '../pages/profile/PublicProfile';
import ClientLogin from '../pages/client/ClientLogin';
import ClientSetPassword from '../pages/client/ClientSetPassword';
import ClientPortal from '../pages/client/ClientPortal';
import ProtectedRoute from './ProtectedRoute';
import ProtectedClientRoute from './ProtectedClientRoute';

const AppRoutes = () => <Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/dashboard/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
  <Route path="/dashboard/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
  <Route path="/dashboard/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
  <Route path="/dashboard/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
  <Route path="/dashboard/notes" element={<ProtectedRoute><NotesIndex /></ProtectedRoute>} />
  <Route path="/dashboard/clients/:clientId/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
  <Route path="/dashboard/clients/:clientId/notes/:sessionId" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
  <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
  <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
  <Route path="/dashboard/packages" element={<ProtectedRoute><Packages /></ProtectedRoute>} />
  <Route path="/dashboard/payments" element={<ProtectedRoute><Packages /></ProtectedRoute>} />
  <Route path="/dashboard/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
  <Route path="/:slug/book" element={<BookingPage />} />
  <Route path="/:slug/payment" element={<Payment />} />
  <Route path="/client/login" element={<ClientLogin />} />
  <Route path="/client/set-password" element={<ClientSetPassword />} />
  <Route path="/client/portal" element={<ProtectedClientRoute><ClientPortal /></ProtectedClientRoute>} />
  <Route path="/:slug" element={<PublicProfile />} />
  <Route path="*" element={<Navigate to="/not-found" replace />} />
  <Route path="/not-found" element={<div className="not-found-page"><h1>404</h1><p>The page you requested could not be found.</p><Link to="/" className="btn btn-blue">Go home</Link></div>} />
</Routes>;
export default AppRoutes;
