document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle ---
    const themeToggleBtn = document.getElementById('themeToggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }

    themeToggleBtn.addEventListener('click', () => {
        let currentTheme = document.documentElement.getAttribute('data-theme');
        let targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', targetTheme);
        localStorage.setItem('theme', targetTheme);
        
        // Toggle Icons
        if (targetTheme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    });

    // --- Navbar Scroll Effect ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- Mobile Menu Toggle ---
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');

    // Quick inline styling for mobile menu state
    let isMenuOpen = false;
    menuToggle.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.right = '0';
            navLinks.style.background = 'var(--card-bg)';
            navLinks.style.padding = '20px';
            navLinks.style.borderBottom = '1px solid var(--border-color)';
            navLinks.style.boxShadow = 'var(--shadow-md)';
            
            // Show actions on mobile too
            const mobileActions = document.createElement('div');
            mobileActions.className = 'mobile-actions';
            mobileActions.style.display = 'flex';
            mobileActions.style.gap = '10px';
            mobileActions.style.marginTop = '15px';
            mobileActions.innerHTML = `
                <a href="https://app.fidely.shiftly.mx" class="btn btn-secondary" style="flex:1; text-align:center;">Iniciar Sesión</a>
            `;
            if(!document.querySelector('.mobile-actions')) {
                navLinks.appendChild(mobileActions);
            }
        } else {
            navLinks.style = ''; // Reset inline styles
            const ma = document.querySelector('.mobile-actions');
            if (ma) ma.remove();
        }
    });

    // --- Contact Form Submission ---
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Simulating form submission
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Enviando...';
            btn.disabled = true;

            // In a real scenario, you would use fetch() to send the data to a backend or service
            setTimeout(() => {
                contactForm.style.display = 'none';
                formSuccess.style.display = 'block';
                
                // Reset button for consistency, though form is hidden
                btn.innerText = originalText;
                btn.disabled = false;
            }, 1500);
        });
    }

    // --- FAQ Accordion ---
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            
            // Close all other accordions
            accordionHeaders.forEach(otherHeader => {
                if (otherHeader !== header) {
                    otherHeader.setAttribute('aria-expanded', 'false');
                    otherHeader.nextElementSibling.style.maxHeight = null;
                }
            });
            
            // Toggle current accordion
            if (!isExpanded) {
                header.setAttribute('aria-expanded', 'true');
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                header.setAttribute('aria-expanded', 'false');
                content.style.maxHeight = null;
            }
        });
    });

    // --- Intersection Observer for Fade-in Animations ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Observers only once
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in-up');
    fadeElements.forEach(el => observer.observe(el));
});
