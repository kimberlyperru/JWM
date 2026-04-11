import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const NAV_LINKS = [
  { path: '/', label: 'HOME' },
  { path: '/live', label: 'LIVE' },
  { path: '/appointment', label: 'BOOK APPOINTMENT' },
  { path: '/new-here', label: "I'M NEW HERE" },
  { path: '/pledge', label: 'PLEDGE' },
  { path: '/give', label: 'GIVE (M-PESA)' },
];

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo-wrap">
           <img src="/images/apple-touch-icon.png" alt="JWM Logo" className="nav-logo-img" />
          <span className="nav-brand">JWM Kajiado</span>
        </Link>

        {/* Desktop Links */}
        <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
          {NAV_LINKS.map(({ path, label }) => (
            <li key={path}>
              <Link
                to={path}
                className={`nav-link${location.pathname === path ? ' active' : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}

          {/* Social Icons */}
          <li className="nav-socials">
            <a href="https://www.facebook.com/p/Jesus-Winner-Ministry-Kajiado-Branch-100064616262795/" target="_blank" rel="noreferrer">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://www.youtube.com/@revtitusndiritu7527" target="_blank" rel="noreferrer">
              <i className="fab fa-youtube"></i>
            </a>
            <a href="https://wa.me/254720178193" target="_blank" rel="noreferrer">
              <i className="fab fa-whatsapp"></i>
            </a>
          </li>

          {/* Admin Link - small and subtle */}
          <li>
            <Link to="/admin" className="nav-admin-link">
              <i className="fas fa-lock"></i>
            </Link>
          </li>
        </ul>

        {/* Hamburger */}
        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
