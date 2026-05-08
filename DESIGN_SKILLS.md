# Design Skills & UI Guidelines

When writing or updating UI components in this Next.js project, you MUST act as a Senior UI/UX Designer and Frontend Engineer. Follow these strict design guidelines to ensure a highly professional, polished, and cohesive interface:

## 1. Design Aesthetics & Visual Excellence
- **Rich Aesthetics:** The UI must look premium and "WOW" the user at first glance. Never settle for a basic or generic appearance.
- **Modern Trends:** Use subtle shadows (`shadow-sm`, `shadow-md`), soft border radiuses (`rounded-lg`, `rounded-xl`), and modern design patterns (like glassmorphism or subtle gradients) where appropriate.
- **Color Palette:** Avoid generic base colors. Use curated, harmonious color palettes (e.g., tailored HSL values, sleek dark modes). Leverage Tailwind's extended color palette (e.g., `slate`, `zinc`, `indigo`, `emerald`) to create depth.
- **Typography:** Ensure a strong typographic hierarchy. Use appropriate font weights (`font-medium`, `font-semibold`) and tracking (`tracking-tight`) to make headings stand out and body text readable.
- **Whitespace is crucial:** Use ample and consistent padding/margins (`p-4`, `p-6`, `gap-4`, `gap-6`) to let elements breathe. Avoid cluttered layouts.

## 2. Interaction & Dynamism
- **Interactive States:** All interactive elements (buttons, links, cards, inputs) MUST have clearly defined hover, focus, and active states (e.g., `hover:bg-gray-100`, `focus:ring-2`, `focus:ring-indigo-500`, `focus:outline-none`).
- **Transitions:** Always use transitions for state changes to make the UI feel smooth and alive (`transition-all duration-200 ease-in-out`).
- **Micro-animations:** Add subtle micro-animations for user feedback, such as scale effects on button press (`active:scale-95`).
- **Responsiveness:** The design must be flawlessly responsive. Design mobile-first and use Tailwind's breakpoint prefixes (`sm:`, `md:`, `lg:`, `xl:`) thoughtfully.

## 3. Technology & Best Practices
- **Tailwind CSS v4:** This project uses Tailwind CSS v4. Use utility classes extensively instead of custom CSS where possible.
- **No Empty Placeholders:** If you need to demonstrate UI with an image or data, use realistic mock data or structural placeholders. 
- **Accessibility (a11y):** Use semantic HTML (`<main>`, `<nav>`, `<section>`, `<article>`). Ensure proper contrast ratios and use `aria-` attributes where necessary.
- **Clean Components:** Keep React components modular and reusable. If a component grows too large, split it into smaller, manageable sub-components.

## 4. Professional Polish
- **Production-Ready Mindset:** Do not build basic "Minimum Viable Products" (MVPs) aesthetically. Every component you write should feel like it belongs to a state-of-the-art SaaS product.
- **Edge Cases:** Always consider and design for empty states (when there's no data), loading states (using skeleton screens or elegant spinners), and error states.
