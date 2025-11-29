const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { dbRun, dbGet } = require('../database/db');
const { protect } = require('../middleware/auth');

// Validation middleware
const profileValidation = [
    body('employmentStatus').notEmpty().withMessage('Employment status is required'),
    body('monthlyIncome').isFloat({ min: 0 }).withMessage('Valid monthly income is required'),
    body('housingCost').isFloat({ min: 0 }).withMessage('Valid housing cost is required'),
    body('utilities').isFloat({ min: 0 }).withMessage('Valid utilities cost is required'),
    body('transportation').isFloat({ min: 0 }).withMessage('Valid transportation cost is required'),
    body('groceries').isFloat({ min: 0 }).withMessage('Valid groceries cost is required')
];

// @route   POST /api/financial-profile
// @desc    Create or update user financial profile
// @access  Private
router.post('/', protect, profileValidation, async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const {
            employmentStatus,
            monthlyIncome,
            additionalIncome,
            additionalIncomeAmount,
            housingCost,
            utilities,
            transportation,
            groceries,
            otherExpenses,
            totalDebt,
            monthlyDebtPayment,
            currentSavings,
            emergencyFund,
            goals,
            savingsGoal,
            timeHorizon,
            riskTolerance,
            totalIncome,
            totalExpenses,
            netIncome
        } = req.body;

        // Check if profile already exists
        const existingProfile = await dbGet(
            'SELECT * FROM financial_profiles WHERE user_id = ?',
            [userId]
        );

        let result;
        if (existingProfile) {
            // Update existing profile
            result = await dbRun(`
                UPDATE financial_profiles SET
                    employment_status = ?,
                    monthly_income = ?,
                    additional_income = ?,
                    additional_income_amount = ?,
                    housing_cost = ?,
                    utilities = ?,
                    transportation = ?,
                    groceries = ?,
                    other_expenses = ?,
                    total_debt = ?,
                    monthly_debt_payment = ?,
                    current_savings = ?,
                    emergency_fund = ?,
                    goals = ?,
                    savings_goal = ?,
                    time_horizon = ?,
                    risk_tolerance = ?,
                    total_income = ?,
                    total_expenses = ?,
                    net_income = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [
                employmentStatus, monthlyIncome, additionalIncome, additionalIncomeAmount,
                housingCost, utilities, transportation, groceries, otherExpenses,
                totalDebt, monthlyDebtPayment, currentSavings, emergencyFund,
                JSON.stringify(goals), savingsGoal, timeHorizon, riskTolerance,
                totalIncome, totalExpenses, netIncome, userId
            ]);
        } else {
            // Create new profile
            result = await dbRun(`
                INSERT INTO financial_profiles (
                    user_id, employment_status, monthly_income, additional_income,
                    additional_income_amount, housing_cost, utilities, transportation,
                    groceries, other_expenses, total_debt, monthly_debt_payment,
                    current_savings, emergency_fund, goals, savings_goal,
                    time_horizon, risk_tolerance, total_income, total_expenses, net_income
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId, employmentStatus, monthlyIncome, additionalIncome,
                additionalIncomeAmount, housingCost, utilities, transportation,
                groceries, otherExpenses, totalDebt, monthlyDebtPayment,
                currentSavings, emergencyFund, JSON.stringify(goals), savingsGoal,
                timeHorizon, riskTolerance, totalIncome, totalExpenses, netIncome
            ]);
        }

        res.status(200).json({
            success: true,
            message: 'Financial profile saved successfully',
            data: {
                profileId: existingProfile ? existingProfile.id : result.id,
                summary: {
                    totalIncome,
                    totalExpenses,
                    netIncome,
                    savingsRate: totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(2) : 0
                }
            }
        });

    } catch (error) {
        console.error('Financial profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving financial profile',
            error: error.message
        });
    }
});

// @route   GET /api/financial-profile
// @desc    Get user financial profile
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user.id;

        const profile = await dbGet(
            'SELECT * FROM financial_profiles WHERE user_id = ?',
            [userId]
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Financial profile not found'
            });
        }

        // Parse goals JSON
        profile.goals = JSON.parse(profile.goals || '[]');

        res.json({
            success: true,
            data: profile
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving financial profile',
            error: error.message
        });
    }
});

// @route   GET /api/financial-profile/ai-summary
// @desc    Get AI-ready summary of financial profile
// @access  Private
router.get('/ai-summary', protect, async (req, res) => {
    try {
        const userId = req.user.id;

        const profile = await dbGet(
            'SELECT * FROM financial_profiles WHERE user_id = ?',
            [userId]
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Financial profile not found'
            });
        }

        // Create AI-friendly summary
        const aiSummary = {
            income: {
                employment: profile.employment_status,
                monthly: profile.monthly_income,
                additional: profile.additional_income_amount,
                total: profile.total_income
            },
            expenses: {
                housing: profile.housing_cost,
                utilities: profile.utilities,
                transportation: profile.transportation,
                groceries: profile.groceries,
                other: profile.other_expenses,
                debt_payment: profile.monthly_debt_payment,
                total: profile.total_expenses
            },
            financial_health: {
                net_income: profile.net_income,
                savings_rate: profile.total_income > 0 ? 
                    ((profile.net_income / profile.total_income) * 100).toFixed(2) : 0,
                debt_to_income: profile.total_income > 0 ?
                    ((profile.monthly_debt_payment / profile.total_income) * 100).toFixed(2) : 0
            },
            assets_liabilities: {
                current_savings: profile.current_savings,
                emergency_fund: profile.emergency_fund,
                total_debt: profile.total_debt
            },
            goals: {
                primary_goals: JSON.parse(profile.goals || '[]'),
                monthly_savings_target: profile.savings_goal,
                time_horizon: profile.time_horizon,
                risk_tolerance: profile.risk_tolerance
            },
            recommendations_needed: []
        };

        // Add recommendation flags
        if (profile.emergency_fund < (profile.total_expenses * 3)) {
            aiSummary.recommendations_needed.push('emergency_fund');
        }
        if (profile.net_income < 0) {
            aiSummary.recommendations_needed.push('expense_reduction');
        }
        if (profile.total_debt > (profile.monthly_income * 12)) {
            aiSummary.recommendations_needed.push('debt_management');
        }

        res.json({
            success: true,
            data: aiSummary
        });

    } catch (error) {
        console.error('AI summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating AI summary',
            error: error.message
        });
    }
});

module.exports = router;
