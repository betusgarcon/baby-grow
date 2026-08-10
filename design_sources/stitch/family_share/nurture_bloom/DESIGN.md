---
name: Nurture & Bloom
colors:
  surface: '#fbf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#fbf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#eae8e5'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#424849'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f0ed'
  outline: '#72787a'
  outline-variant: '#c2c7c9'
  surface-tint: '#496269'
  primary: '#496269'
  on-primary: '#ffffff'
  primary-container: '#8fa9b0'
  on-primary-container: '#253e44'
  inverse-primary: '#b1cbd2'
  secondary: '#56624e'
  on-secondary: '#ffffff'
  secondary-container: '#d9e7ce'
  on-secondary-container: '#5c6854'
  tertiary: '#835332'
  on-tertiary: '#ffffff'
  tertiary-container: '#d39872'
  on-tertiary-container: '#593012'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce7ef'
  primary-fixed-dim: '#b1cbd2'
  on-primary-fixed: '#041f24'
  on-primary-fixed-variant: '#324b51'
  secondary-fixed: '#d9e7ce'
  secondary-fixed-dim: '#becbb3'
  on-secondary-fixed: '#141e0f'
  on-secondary-fixed-variant: '#3e4a38'
  tertiary-fixed: '#ffdbc7'
  tertiary-fixed-dim: '#f8b991'
  on-tertiary-fixed: '#311300'
  on-tertiary-fixed-variant: '#673c1d'
  background: '#fbf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 20px
  margin-mobile: 20px
  margin-desktop: 120px
---

## Brand & Style

The design system is centered on the concepts of growth, mindfulness, and gentle progress. It targets individuals seeking a sanctuary for personal development and well-being. The emotional response is one of "quiet confidence"—reducing cognitive load through soft transitions and an unhurried visual pace.

The style is a fusion of **Soft Minimalism** and **Organic Tactility**. It prioritizes heavy whitespace to give content room to breathe, utilizing card-based structures that feel like physical objects placed on a soft surface. Interaction design should feel fluid and rhythmic, avoiding jarring movements in favor of ease-in-out transitions.

## Colors

The palette adopts a **Morandi aesthetic**, characterized by desaturated, "dusty" tones that create a sense of harmony and low-contrast comfort. 

- **Primary (Dusty Blue):** Used for primary actions, focus states, and key navigational elements.
- **Secondary (Sage Green):** Representing growth; used for success states, progress indicators, and nature-related content.
- **Tertiary (Warm Orange):** An accent color for highlights, notifications, and ritualistic elements that require gentle attention.
- **Neutral (Warm Grey/Cream):** The foundation of the system, used for backgrounds to reduce eye strain compared to pure white.
- **Status Colors:** Use muted variations of the brand palette (e.g., a desaturated rose for errors) to maintain the gentle atmosphere.

## Typography

This design system utilizes **Plus Jakarta Sans** exclusively to maintain a contemporary and approachable feel. The typography emphasizes readability and a soft geometric structure.

- **Headlines:** Use tighter letter spacing and semi-bold weights to create a clear hierarchy against the softer background colors.
- **Body Text:** Use ample line height (1.5x minimum) to enhance the feeling of "breathable" content.
- **Labels:** Small labels and captions should use slightly increased letter spacing and medium weights to ensure legibility despite the low-contrast color palette.

## Layout & Spacing

The layout philosophy follows a **Fluid Card-Based Grid**. Content is organized into distinct containers that sit on the neutral background, creating a natural grouping of information.

- **Desktop:** A 12-column grid with wide margins (120px) to keep content centered and focused.
- **Mobile:** A 4-column grid with 20px margins. 
- **Spacing Rhythm:** Use a baseline of 8px. Use larger increments (40px, 64px) between major sections to emphasize the "minimalist" and "uncluttered" nature of the brand. Vertical spacing should always err on the side of generosity.

## Elevation & Depth

Hierarchy is achieved through **Ambient Shadows** and **Tonal Layering**. 

- **Surfaces:** The base layer is the neutral background. Cards and primary containers sit one level above this using a very soft, diffused shadow (`blur: 30px, opacity: 0.04, color: #000`).
- **Interactive States:** On hover or tap, cards should not "pop" aggressively. Instead, the shadow should slightly expand in blur radius while the card scales minimally (1.02x).
- **Depth:** Avoid high-contrast borders. Use subtle 1px inner strokes in a color slightly darker than the surface for definition if necessary, but prefer shadow-based separation.

## Shapes

The shape language is defined by **Maximum Fluidity**. 

- **Cards and Containers:** Use `rounded-xl` or `rounded-2xl` to ensure no sharp edges exist within the UI.
- **Buttons and Chips:** Utilize full pill-shapes (`rounded-full`) for all interactive buttons and tags.
- **Icons:** Should feature rounded terminals and soft corners, avoiding any 90-degree joins where possible.

## Components

### Buttons & FAB
- **Primary FAB:** A central Floating Action Button is docked in the middle of the bottom navigation bar. It is larger than other icons, uses a pill-shape or circle, and carries the Primary Blue or Tertiary Orange color to act as the "heart" of the interface.
- **Standard Buttons:** Pill-shaped with semi-bold labels. High-emphasis buttons use solid fills; low-emphasis buttons use soft tonal backgrounds (5% opacity of the primary color).

### Ritualistic Milestone Badges
- **Style:** Circular badges with a soft metallic gradient.
- **Gold:** Muted ochre to soft yellow gradient (#D4AF37 to #F2E3B5).
- **Silver:** Sage-tinted silver gradient (#C0C0C0 to #E8E8E8).
- **Bronze:** Dusty rose-copper gradient (#CD7F32 to #EBC8AF).
- **Visuals:** Minimalist iconography inside the badge, using thin 1.5pt strokes.

### Skeleton Loaders
- **Appearance:** Use a soft "shimmer" effect moving from left to right.
- **Color:** The loader base should match the card background, with the shimmer being a slightly lighter tint of the Neutral color. Ensure the edges of the skeleton blocks match the `roundedness` of the final component.

### Input Fields & Lists
- **Inputs:** Soft-filled backgrounds with no borders unless focused. On focus, a subtle 2px stroke in the Primary color appears.
- **Lists:** Separated by whitespace or very light 1px dividers that stop 24px before the container edges.

### Cards
- **Base:** White or very light cream background with soft ambient shadows. 
- **Padding:** Minimum 24px internal padding to ensure content does not feel cramped against the rounded corners.