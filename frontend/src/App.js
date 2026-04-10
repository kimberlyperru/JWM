import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Live from './pages/Live';
import BookAppointment from './pages/BookAppointment';
import ImNewHere from './pages/ImNewHere';
import Pledge from './pages/Pledge';
import Mpesa from './pages/Mpesa';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<Live />} />
          <Route path="/appointment" element={<BookAppointment />} />
          <Route path="/new-here" element={<ImNewHere />} />
          <Route path="/pledge" element={<Pledge />} />
          <Route path="/give" element={<Mpesa />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
