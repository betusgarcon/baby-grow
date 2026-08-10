---
name: Nurture & Bloom
colors:
  surface: '#fff8f1'
  surface-dim: '#e0d9d1'
  surface-bright: '#fff8f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf2ea'
  surface-container: '#f4ede5'
  surface-container-high: '#eee7df'
  surface-container-highest: '#e8e1d9'
  on-surface: '#1e1b17'
  on-surface-variant: '#474741'
  inverse-surface: '#33302b'
  inverse-on-surface: '#f7f0e8'
  outline: '#777770'
  outline-variant: '#c8c7be'
  surface-tint: '#5f5f59'
  primary: '#5f5f59'
  on-primary: '#ffffff'
  primary-container: '#fffdf5'
  on-primary-container: '#75756e'
  inverse-primary: '#c8c7bf'
  secondary: '#765842'
  on-secondary: '#ffffff'
  secondary-container: '#fed5b9'
  on-secondary-container: '#795b44'
  tertiary: '#406651'
  on-tertiary: '#ffffff'
  tertiary-container: '#f7fff7'
  on-tertiary-container: '#557d66'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e3db'
  primary-fixed-dim: '#c8c7bf'
  on-primary-fixed: '#1b1c17'
  on-primary-fixed-variant: '#474742'
  secondary-fixed: '#ffdcc4'
  secondary-fixed-dim: '#e6bfa4'
  on-secondary-fixed: '#2b1706'
  on-secondary-fixed-variant: '#5c412c'
  tertiary-fixed: '#c1edd1'
  tertiary-fixed-dim: '#a6d0b6'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#284e3a'
  background: '#fff8f1'
  on-background: '#1e1b17'
  surface-variant: '#e8e1d9'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  caption:
    fontFamily: Nunito Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  margin-mobile: 20px
  gutter-mobile: 12px
---

## Brand & Style

The design system is centered on the concept of "Gentle Rituals." It seeks to evoke an emotional response of safety, warmth, and quiet joy, mirroring the nurturing environment of a nursery. The target audience includes new parents and caregivers who require a tool that feels like a supportive companion rather than a clinical utility.

The aesthetic blends **Minimalism** with **Glassmorphism** and **Soft Tactility**. It uses expansive whitespace to reduce cognitive load for sleep-deprived parents, while employing translucent, frosted layers to create a sense of depth and preciousness. The interface should feel "soft to the touch," utilizing organic curves and a palette that avoids the harshness of pure digital whites.

## Colors

This design system moves away from clinical starkness by using **Creamy Ivory (#FFFDF5)** as the base surface color. This reduces blue-light strain and provides a paper-like warmth. 

The palette is inspired by high-end macaron confections:
- **Primary (Creamy Yellow/Ivory):** The main canvas for all screens.
- **Peach Pink (#FFD6BA):** Used for growth milestones and emotional highlights.
- **Soft Mint (#B9E4C9):** Used for health data, feeding logs, and "success" states.
- **Sky Blue (#B8E1FF):** Used for sleep tracking and AI companion interactions.
- **Neutral (#5C5852):** A warm, desaturated charcoal used for text to maintain high legibility without the jarring contrast of pure black.

## Typography

The typography strategy focuses on "friendly legibility." **Plus Jakarta Sans** provides a modern, slightly rounded geometric feel for headings, ensuring the app feels contemporary yet approachable. **Nunito Sans** is used for all functional and body text; its naturally rounded terminals reinforce the gentle brand personality.

All text should be rendered with a slight optical weight increase to ensure readability against the pastel backgrounds. Avoid all-caps styling; sentence case is preferred to maintain a conversational, nurturing tone.

## Layout & Spacing

The layout follows a **Fluid Grid** model with generous safe areas. For mobile, a 4-column grid is used with 20px outer margins to ensure content doesn't feel cramped. 

The spacing rhythm is based on a **4px baseline**, but larger "breathing rooms" (24px and 32px) are prioritized between functional groups to create the "High-quality whitespace" required. Vertical stacks should feel rhythmic and unhurried. Use "Cloud-padding"—where secondary information is tucked away with ample internal margins—to keep the interface feeling light.

## Elevation & Depth

Depth is conveyed through **Soft Ambient Shadows** and **Glassmorphism**. Shadows are never black; they are tinted with the brand’s neutral-warm hue at very low opacity (5-8%) with high blur radii (20px+) to simulate a soft glow rather than a hard drop.

- **Surface Level:** The Ivory background.
- **Layer 1 (Cards):** Solid white or very pale pastel with a soft shadow.
- **Layer 2 (Overlays/AI Chat):** Frosted glass (Backdrop blur: 12px) with a subtle 1px white inner border to simulate a glass edge.
- **Interaction:** Elements "lift" slightly on press, increasing the shadow spread rather than darkening the color.

## Shapes

The shape language is dominated by high-radius curves and "squircle" forms. There are no sharp corners in the design system. Interactive elements like buttons and chips utilize a **Pill-shaped (Radius: 3)** approach to feel safe and organic.

Larger containers (cards) use a minimum of 24px corner radius. Icons must feature rounded end-caps and joined segments to maintain the "soft-touch" philosophy.

## Components

- **Buttons:** Primary buttons are pill-shaped with a soft gradient or solid pastel fill. Use a subtle inner-glow rather than a harsh border.
- **Cards:** Use "Floating Containers" with 24px radius and 16px internal padding. Avoid heavy borders; use light shadows or 1px tonal strokes.
- **Input Fields:** Rounded containers with a subtle cream-tinted fill. Focus states should use a soft glow in the primary blue or mint.
- **Chips/Labels:** Used for tracking categories (e.g., "Nap," "Feeding"). These should be highly rounded and color-coded using the macaron palette.
- **AI Companion Bubble:** A distinct glassmorphic bubble with a subtle "pulse" animation to signify active listening or thinking.
- **Timeline Markers:** Instead of a hard line, use a series of soft, dotted paths or organic "pebble" shapes to mark time intervals in the growth record.
- **Progress Bars:** Thick, rounded bars with "End-cap" icons (e.g., a small leaf or star) to celebrate progress.