// Registration Form Management

class RegistrationManager {
    constructor() {
        this.currentStep = 1;
        this.formData = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPasswordStrength();
        this.updateStepIndicator();
    }

    setupEventListeners() {
        const form = document.getElementById('registration-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegistration();
            });
        }

        // Step navigation buttons
        const nextStep2Btn = document.getElementById('next-step-2');
        if (nextStep2Btn) {
            nextStep2Btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextStep(2);
            });
        }

        const nextStep3Btn = document.getElementById('next-step-3');
        if (nextStep3Btn) {
            nextStep3Btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextStep(3);
            });
        }

        const prevStep1Btn = document.getElementById('prev-step-1');
        if (prevStep1Btn) {
            prevStep1Btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.previousStep(1);
            });
        }

        const prevStep2Btn = document.getElementById('prev-step-2');
        if (prevStep2Btn) {
            prevStep2Btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.previousStep(2);
            });
        }

        // Real-time validation
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        // Email validation
        const emailField = document.getElementById('email');
        if (emailField) {
            emailField.addEventListener('blur', () => {
                this.validateEmail(emailField.value);
            });
        }

        // Password confirmation
        const confirmPasswordField = document.getElementById('confirmPassword');
        if (confirmPasswordField) {
            confirmPasswordField.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }

        // Organization name validation
        const orgNameField = document.getElementById('organizationName');
        if (orgNameField) {
            orgNameField.addEventListener('blur', () => {
                this.validateOrganizationName(orgNameField.value);
            });
        }
    }

    setupPasswordStrength() {
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
    }

    updatePasswordStrength(password) {
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');
        
        if (!strengthFill || !strengthText) return;

        const strength = this.calculatePasswordStrength(password);
        
        // Remove existing classes
        strengthFill.className = 'strength-fill';
        
        if (password.length === 0) {
            strengthText.textContent = 'Password strength will appear here';
            return;
        }

        switch (strength.level) {
            case 1:
                strengthFill.classList.add('strength-weak');
                strengthText.textContent = 'Weak password';
                strengthText.style.color = '#f56565';
                break;
            case 2:
                strengthFill.classList.add('strength-fair');
                strengthText.textContent = 'Fair password';
                strengthText.style.color = '#ed8936';
                break;
            case 3:
                strengthFill.classList.add('strength-good');
                strengthText.textContent = 'Good password';
                strengthText.style.color = '#48bb78';
                break;
            case 4:
                strengthFill.classList.add('strength-strong');
                strengthText.textContent = 'Strong password';
                strengthText.style.color = '#38a169';
                break;
        }
    }

    calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        score = Object.values(checks).filter(Boolean).length;
        
        return {
            level: Math.min(score, 4),
            checks
        };
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);
        
        const emailField = document.getElementById('email');
        if (emailField) {
            if (isValid) {
                emailField.classList.remove('is-invalid');
                emailField.classList.add('is-valid');
            } else if (email.length > 0) {
                emailField.classList.remove('is-valid');
                emailField.classList.add('is-invalid');
            }
        }
        
        return isValid;
    }

    validatePasswordMatch() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmField = document.getElementById('confirmPassword');
        
        if (confirmPassword.length > 0) {
            if (password === confirmPassword) {
                confirmField.classList.remove('is-invalid');
                confirmField.classList.add('is-valid');
                return true;
            } else {
                confirmField.classList.remove('is-valid');
                confirmField.classList.add('is-invalid');
                return false;
            }
        }
        
        return true;
    }

    validateOrganizationName(name) {
        const isValid = name.length >= 2;
        const orgField = document.getElementById('organizationName');
        
        if (orgField) {
            if (isValid) {
                orgField.classList.remove('is-invalid');
                orgField.classList.add('is-valid');
            } else if (name.length > 0) {
                orgField.classList.remove('is-valid');
                orgField.classList.add('is-invalid');
            }
        }
        
        return isValid;
    }

    validateStep(step) {
        console.log('Validating step:', step);
        let isValid = true;
        const section = document.getElementById(`section-${step}`);

        if (!section) {
            console.error('Section not found for step:', step);
            return false;
        }

        const requiredFields = section.querySelectorAll('input[required], select[required]');
        console.log('Found required fields:', requiredFields.length);

        requiredFields.forEach(field => {
            console.log('Validating field:', field.name, 'value:', field.value);
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
                console.log('Field is invalid:', field.name);
            } else {
                field.classList.remove('is-invalid');
                field.classList.add('is-valid');
                console.log('Field is valid:', field.name);
            }
        });

        // Additional validations for step 1
        if (step === 1) {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (email && !this.validateEmail(email)) {
                console.log('Email validation failed');
                isValid = false;
            }

            if (password && confirmPassword && password !== confirmPassword) {
                console.log('Password confirmation failed');
                this.validatePasswordMatch();
                isValid = false;
            }

            // Make password strength less strict for demo
            if (password) {
                const passwordStrength = this.calculatePasswordStrength(password);
                if (passwordStrength.level < 1) {
                    if (window.authManager) {
                        window.authManager.showAlert('warning', 'Please choose a stronger password');
                    }
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    nextStep(step) {
        console.log('nextStep called with step:', step, 'current step:', this.currentStep);

        if (this.validateStep(this.currentStep)) {
            console.log('Validation passed, moving to step', step);
            this.collectStepData(this.currentStep);
            this.currentStep = step;
            this.showStep(step);
            this.updateStepIndicator();

            if (step === 3) {
                this.populateReview();
            }
        } else {
            console.log('Validation failed for step', this.currentStep);
            if (window.authManager) {
                window.authManager.showAlert('danger', 'Please fill in all required fields correctly');
            } else {
                alert('Please fill in all required fields correctly');
            }
        }
    }

    previousStep(step) {
        this.currentStep = step;
        this.showStep(step);
        this.updateStepIndicator();
    }

    showStep(step) {
        // Hide all sections
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show current section
        const currentSection = document.getElementById(`section-${step}`);
        if (currentSection) {
            currentSection.classList.add('active');
        }
    }

    updateStepIndicator() {
        for (let i = 1; i <= 3; i++) {
            const stepElement = document.getElementById(`step-${i}`);
            if (stepElement) {
                stepElement.classList.remove('active', 'completed');
                
                if (i < this.currentStep) {
                    stepElement.classList.add('completed');
                } else if (i === this.currentStep) {
                    stepElement.classList.add('active');
                }
            }
        }
    }

    collectStepData(step) {
        const section = document.getElementById(`section-${step}`);
        const inputs = section.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                this.formData[input.name] = input.checked;
            } else {
                this.formData[input.name] = input.value;
            }
        });
    }

    populateReview() {
        const reviewContent = document.getElementById('review-content');
        if (!reviewContent) return;

        const reviewHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-primary">Personal Information</h6>
                    <p><strong>Name:</strong> ${this.formData.firstName} ${this.formData.lastName}</p>
                    <p><strong>Email:</strong> ${this.formData.email}</p>
                    <p><strong>Phone:</strong> ${this.formData.phone || 'Not provided'}</p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-primary">Organization Details</h6>
                    <p><strong>Organization:</strong> ${this.formData.organizationName}</p>
                    <p><strong>Type:</strong> ${this.formData.organizationType}</p>
                    <p><strong>Industry:</strong> ${this.formData.industry || 'Not specified'}</p>
                    <p><strong>Website:</strong> ${this.formData.website || 'Not provided'}</p>
                </div>
            </div>
            ${this.formData.description ? `
                <div class="mt-3">
                    <h6 class="text-primary">Business Description</h6>
                    <p>${this.formData.description}</p>
                </div>
            ` : ''}
        `;

        reviewContent.innerHTML = reviewHTML;
    }

    async handleRegistration() {
        // Collect final step data
        this.collectStepData(3);
        
        // Validate terms acceptance
        if (!this.formData.terms) {
            window.authManager.showAlert('danger', 'Please accept the Terms of Service to continue');
            return;
        }

        window.authManager.setLoading('register', true);
        window.authManager.clearAlerts();

        try {
            const registrationData = {
                email: this.formData.email,
                password: this.formData.password,
                firstName: this.formData.firstName,
                lastName: this.formData.lastName,
                phone: this.formData.phone,
                organizationName: this.formData.organizationName,
                organizationType: this.formData.organizationType,
                industry: this.formData.industry,
                website: this.formData.website,
                description: this.formData.description,
                acceptMarketing: this.formData.marketing || false
            };

            const response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });

            const result = await response.json();

            if (response.ok) {
                window.authManager.showAlert('success', 'Account created successfully! Please check your email for verification.');
                
                // Auto-login after successful registration
                setTimeout(async () => {
                    try {
                        const loginResponse = await fetch('/api/v1/auth/login', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                email: this.formData.email,
                                password: this.formData.password
                            })
                        });

                        if (loginResponse.ok) {
                            const loginResult = await loginResponse.json();
                            window.authManager.handleLoginSuccess(loginResult);
                        } else {
                            // Redirect to login page
                            window.location.href = '/ui/auth/login.html';
                        }
                    } catch (error) {
                        console.error('Auto-login failed:', error);
                        window.location.href = '/ui/auth/login.html';
                    }
                }, 2000);
                
            } else {
                window.authManager.showAlert('danger', result.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            window.authManager.showAlert('danger', 'Network error. Please check your connection and try again.');
        } finally {
            window.authManager.setLoading('register', false);
        }
    }
}

// Global functions for navigation
function nextStep(step) {
    if (window.registrationManager) {
        window.registrationManager.nextStep(step);
    } else {
        console.error('Registration manager not initialized');
    }
}

function previousStep(step) {
    if (window.registrationManager) {
        window.registrationManager.previousStep(step);
    } else {
        console.error('Registration manager not initialized');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing registration manager');
    window.registrationManager = new RegistrationManager();
    console.log('Registration system initialized');

    // Also set up global event listeners as backup
    setupGlobalEventListeners();
});

function setupGlobalEventListeners() {
    // Backup event listeners in case the class-based ones don't work
    const nextStep2Btn = document.getElementById('next-step-2');
    if (nextStep2Btn) {
        nextStep2Btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Next step 2 clicked');
            nextStep(2);
        });
    }

    const nextStep3Btn = document.getElementById('next-step-3');
    if (nextStep3Btn) {
        nextStep3Btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Next step 3 clicked');
            nextStep(3);
        });
    }

    const prevStep1Btn = document.getElementById('prev-step-1');
    if (prevStep1Btn) {
        prevStep1Btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Previous step 1 clicked');
            previousStep(1);
        });
    }

    const prevStep2Btn = document.getElementById('prev-step-2');
    if (prevStep2Btn) {
        prevStep2Btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Previous step 2 clicked');
            previousStep(2);
        });
    }
}
