# Classification Criteria

Classify each document or section by its purpose:

- Does it walk through steps to learn? Tutorial.
- Does it solve a specific problem? How-to.
- Does it describe APIs, configurations, or specifications? Reference.
- Does it explain concepts or rationale? Explanation.

## Tutorials (Learning)

**Characteristics:**

- Step-by-step instructions for learners
- Builds toward a working example
- Focuses on "what the user does"
- Has a concrete end goal

**Example titles:**

- "Your First Application"
- "Getting Started with X"
- "Building a Sample Project"

**DO NOT include:**

- Exhaustive options or configurations
- Theoretical explanations
- Edge cases

## How-to Guides (Tasks)

**Characteristics:**

- Assumes basic knowledge
- Addresses a specific problem
- Provides actionable steps
- May have multiple valid approaches

**Example titles:**

- "How to Deploy to Production"
- "Migrating from v1 to v2"
- "Configuring Authentication"

**DO NOT include:**

- Teaching fundamentals
- Complete API documentation
- Philosophical discussions

## Reference (Information)

**Characteristics:**

- Accurate and complete
- Consistent structure
- Describes interfaces, behavior, and constraints
- Dry, factual tone

**Example content:**

- API endpoints and parameters
- Configuration options
- CLI commands and flags
- Data schemas

**DO NOT include:**

- Explanations of why
- Step-by-step tutorials
- Opinions or recommendations

## Explanation (Understanding)

**Characteristics:**

- Discusses context and background
- Explains design decisions
- Connects concepts together
- Can be discursive

**Example titles:**

- "Understanding the Event Loop"
- "Why We Chose X over Y"
- "Architecture Overview"

**DO NOT include:**

- How-to instructions
- Reference specifications
- Learning walkthroughs

## Anti-Patterns to Fix

| Problem | Solution |
|---------|----------|
| Tutorial with exhaustive options | Move options to reference, link to it |
| How-to explaining fundamentals | Extract to tutorial, assume knowledge |
| Reference with a task walkthrough | Move the walkthrough to how-to; keep concise usage examples |
| Explanation dominated by procedural code | Move the procedure to how-to; keep snippets that clarify concepts |
| One giant README | Split into proper quadrants |
