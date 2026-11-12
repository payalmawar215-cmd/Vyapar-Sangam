"""
Core utilities and shared helper functions for Vyapar Sangam backend.
"""

def format_currency_inr(amount):
    """Utility to format an amount in Indian Rupees (INR)."""
    if amount is None:
        return "N/A"
    return f"₹{amount:,.2f}"
