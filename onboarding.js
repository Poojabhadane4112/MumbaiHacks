let currentStep = 1;
const totalSteps = 4;

// Check if user is authenticated
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fincoach_token');
    if (!token) {
        window.location.href = 'auth.html';
    }
    updateStepIndicator();
});

// Change step function
function changeStep(direction) {
    const steps = document.querySelectorAll('.form-step');
    const currentStepElement = steps[currentStep - 1];
    
    // Validate current step before moving forward
    if (direction === 1 && !validateStep(currentStep)) {
        return;
    }
    
    // Hide current step
    currentStepElement.classList.remove('active');
    
    // Update step number
    currentStep += direction;
    
    // Show new step
    steps[currentStep - 1].classList.add('active');
    
    // Update UI
    updateStepIndicator();
    updateButtons();
    updateProgressBar();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validate step
function validateStep(step) {
    const stepElement = document.querySelector(`.form-step[data-step="${step}"]`);
    const requiredInputs = stepElement.querySelectorAll('[required]');
    
    for (let input of requiredInputs) {
        if (!input.value) {
            input.focus();
            alert('Please fill in all required fields');
            return false;
        }
    }
    return true;
}

// Update step indicator
function updateStepIndicator() {
    document.getElementById('currentStep').textContent = currentStep;
    document.getElementById('totalSteps').textContent = totalSteps;
}

// Update buttons
function updateButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    // Show/hide previous button
    prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
    
    // Show/hide next and submit buttons
    if (currentStep === totalSteps) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

// Update progress bar
function updateProgressBar() {
    const progress = (currentStep / totalSteps) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

// Handle form submission
document.getElementById('onboardingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Collect all form data
    const formData = {
        // Step 1: Income
        employmentStatus: document.getElementById('employmentStatus').value,
        monthlyIncome: parseFloat(document.getElementById('monthlyIncome').value),
        additionalIncome: document.getElementById('additionalIncome').value,
        additionalIncomeAmount: parseFloat(document.getElementById('additionalIncomeAmount').value) || 0,
        
        // Step 2: Expenses
        housingCost: parseFloat(document.getElementById('housingCost').value),
        utilities: parseFloat(document.getElementById('utilities').value),
        transportation: parseFloat(document.getElementById('transportation').value),
        groceries: parseFloat(document.getElementById('groceries').value),
        otherExpenses: parseFloat(document.getElementById('otherExpenses').value) || 0,
        
        // Step 3: Debts & Savings
        totalDebt: parseFloat(document.getElementById('totalDebt').value) || 0,
        monthlyDebtPayment: parseFloat(document.getElementById('monthlyDebtPayment').value) || 0,
        currentSavings: parseFloat(document.getElementById('currentSavings').value) || 0,
        emergencyFund: parseFloat(document.getElementById('emergencyFund').value) || 0,
        
        // Step 4: Goals
        goals: Array.from(document.querySelectorAll('input[name="goals"]:checked')).map(cb => cb.value),
        savingsGoal: parseFloat(document.getElementById('savingsGoal').value) || 0,
        timeHorizon: document.getElementById('timeHorizon').value,
        riskTolerance: document.getElementById('riskTolerance').value
    };
    
    // Calculate totals
    formData.totalIncome = formData.monthlyIncome + formData.additionalIncomeAmount;
    formData.totalExpenses = formData.housingCost + formData.utilities + 
                             formData.transportation + formData.groceries + 
                             formData.otherExpenses + formData.monthlyDebtPayment;
    formData.netIncome = formData.totalIncome - formData.totalExpenses;
    
    try {
        const token = localStorage.getItem('fincoach_token');
        
        const response = await fetch('http://localhost:3000/api/financial-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store profile completion status
            localStorage.setItem('profile_completed', 'true');
            
            // Show success message
            alert('Financial profile created successfully! Redirecting to dashboard...');
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error submitting profile:', error);
        alert('Failed to save financial profile. Please try again.');
    }
});

// Initialize
updateButtons();
updateProgressBar();
