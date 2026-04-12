# @hcengineering/contact

People and organization types. Contacts, employees, channels, social identities, avatars.

## RN Safety: Type-only

Depends on `@hcengineering/ui` → svelte. Use `import type` exclusively.

## Key Types

| Type | Purpose |
|------|---------|
| `Person` | firstName, lastName, birthday, socialIds |
| `Employee` | Person + active, role, position, personUuid |
| `Contact` | Base: name, city, channels |
| `Organization` | Org with members, description |
| `Channel` | Communication method (email, phone, etc.) |
| `ChannelProvider` | Provider type (email, phone, LinkedIn, GitHub) |
| `Member` | Space membership |
| `AvatarInfo` | Avatar: type (COLOR/IMAGE/GRAVATAR), ref |
| `SocialIdentity` | External identity mapping |

## Dependencies

`core`, `platform`, `view`, `ui`, `templates`, `preference`, `card`
