# Design System Components

This directory contains the core components that make up our design system. These components are built with React, TypeScript, and Tailwind CSS, providing a consistent and accessible interface across the application.

## Components

### Button
A versatile button component that supports different variants, sizes, and states.

```tsx
import { Button } from '@/components/design-system';

// Primary button
<Button variant="primary">Click me</Button>

// Secondary button with icon
<Button 
  variant="secondary"
  size="lg"
  leftIcon={<IconComponent />}
>
  With Icon
</Button>

// Loading state
<Button loading>Loading...</Button>
```

### Input
A flexible input component with support for labels, helper text, and error states.

```tsx
import { Input } from '@/components/design-system';

// Basic input with label
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
/>

// Input with error state
<Input
  label="Username"
  error="Username is required"
/>

// Input with helper text and icons
<Input
  label="Search"
  helperText="Enter keywords to search"
  leftIcon={<SearchIcon />}
  rightIcon={<ClearIcon />}
/>
```

### Card
A container component for grouping related content with various elevation levels.

```tsx
import { Card } from '@/components/design-system';

// Basic card
<Card>
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</Card>

// Interactive card with custom elevation
<Card
  interactive
  elevation="md"
  onClick={() => console.log('Card clicked')}
>
  <h2>Interactive Card</h2>
  <p>Click me!</p>
</Card>
```

### Badge
A component for status indicators and labels.

```tsx
import { Badge } from '@/components/design-system';

// Basic badge
<Badge>Default</Badge>

// Status badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>

// Badge with icon
<Badge
  variant="success"
  leftIcon={<CheckIcon />}
>
  Completed
</Badge>
```

## Design Tokens

Our design system uses a consistent set of design tokens for:

### Colors
- Primary: Brand colors and main actions
- Secondary: Supporting elements
- Success/Warning/Error: Status indicators
- Neutral: Text, backgrounds, and borders

### Typography
- Font Families:
  - Inter var: Main text
  - Lexend: Display text
  - JetBrains Mono: Code blocks
- Font Sizes: xs through 3xl
- Line Heights: Optimized for readability

### Spacing
- Consistent scale from px to 24 (6rem)
- Used for padding, margins, and gaps
- Maintains visual rhythm

### Shadows
- Multiple elevation levels
- Used for depth and interaction states
- Consistent across components

## Usage Guidelines

1. Import components from the design system:
```tsx
import { Button, Input, Card, Badge } from '@/components/design-system';
```

2. Use Tailwind utility classes for minor adjustments, but prefer component props for main styling:
```tsx
<Card className="mt-4">
  <Button fullWidth>Full Width Button</Button>
</Card>
```

3. Follow accessibility best practices:
- Use semantic HTML elements
- Provide ARIA labels where needed
- Ensure proper color contrast
- Support keyboard navigation

4. Maintain consistency:
- Use provided components instead of creating new ones
- Follow the established design patterns
- Utilize design tokens for custom styling

## Contributing

When adding new components or modifying existing ones:

1. Follow the established patterns
2. Include proper TypeScript types
3. Document props and usage
4. Consider accessibility
5. Add usage examples to this README

## Future Improvements

1. Add more interactive components:
- Select
- Checkbox
- Radio
- Toggle
- Dropdown

2. Enhance existing components:
- Add more variants
- Improve animations
- Add more customization options

3. Implement additional features:
- Dark mode support
- RTL support
- Animation system
- Icon system