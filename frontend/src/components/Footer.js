import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col">
          <h4>Jesus Winner Ministry</h4>
          <p>A ministry of all nations, transforming lives through the power of the Gospel.</p>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/live">Live Service</Link></li>
            <li><Link to="/appointment">Book Appointment</Link></li>
            <li><Link to="/new-here">I'm New Here</Link></li>
            <li><Link to="/pledge">Pledge</Link></li>
            <li><Link to="/give">Give (M-Pesa)</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Contact Us</h4>
          <p><i className="fas fa-map-marker-alt"></i> Showground, Kajiado</p>
          <p><i className="fas fa-phone"></i> +254 720 178193</p>
          <p><i className="fas fa-envelope"></i>
            <a href="mailto:info@jwmkajiado.org"> info@jwmkajiado.org</a>
          </p>
          <div className="footer-socials">
            <a href="https://www.facebook.com/p/Jesus-Winner-Ministry-Kajiado-Branch-100064616262795/" target="_blank" rel="noreferrer">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://www.youtube.com/@revtitusndiritu7527" target="_blank" rel="noreferrer">
              <i className="fab fa-youtube"></i>
            </a>
            <a href="https://wa.me/254720178193" target="_blank" rel="noreferrer">
              <i className="fab fa-whatsapp"></i>
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} JWM Kajiado Branch. All Rights Reserved.</p>
        <p>Designed by <a href="http://bit.ly/4610EWk" target="_blank" rel="noreferrer">PERRU</a></p>
      </div>
    </footer>
  );
}

export default Footer;
