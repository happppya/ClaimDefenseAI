# utils/theme.py
import streamlit as st
import os
from dataclasses import dataclass

@dataclass
class ThemeTokens:
    """
    Centralized design tokens mapping to CSS variables.
    """
    bg_base: str = "#0E0E0E"
    bg_surface: str = "#161616"
    bg_elevated: str = "#1E1E1E"
    text_primary: str = "#F3F4F6"
    text_secondary: str = "#9CA3AF"
    accent: str = "#3B82F6"
    accent_hover: str = "#2563EB"
    border: str = "#27272A"
    radius_md: str = "8px"
    radius_lg: str = "12px"
    font_sans: str = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

def inject_design_system(tokens: ThemeTokens) -> None:
    """
    Mounts CSS custom properties to the DOM root and orchestrates component overrides
    by loading external stylesheet.
    
    Args:
        tokens (ThemeTokens): Dataclass containing color and spatial tokens.
    """
    # 1. Construct dynamic root variables
    root_vars = f"""
    :root {{
        --bg-base: {tokens.bg_base};
        --bg-surface: {tokens.bg_surface};
        --bg-elevated: {tokens.bg_elevated};
        --text-primary: {tokens.text_primary};
        --text-secondary: {tokens.text_secondary};
        --accent: {tokens.accent};
        --border: {tokens.border};
        --radius-md: {tokens.radius_md};
        --radius-lg: {tokens.radius_lg};
        --font-sans: {tokens.font_sans};
    }}
    """
    
    # 2. Read static CSS mutators
    css_path = os.path.join(os.path.dirname(__file__), "..", "assets", "styles.css")
    try:
        with open(css_path, "r") as f:
            static_css = f.read()
    except FileNotFoundError:
        static_css = "/* Error: styles.css not found */"

    # 3. Inject payload
    st.markdown(f"<style>{root_vars}\n{static_css}</style>", unsafe_allow_html=True)