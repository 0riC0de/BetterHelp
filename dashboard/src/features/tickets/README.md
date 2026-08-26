# Tickets Feature

This package owns ticket conversation UI, ticket hooks, ticket models, and pure
ticket helpers. Components receive state and actions through props; HTTP and
realtime behavior belongs in hooks/services. Pages compose these public pieces.

Media is loaded through authenticated API URLs. Text and attachments share the
same idempotent message lifecycle. Ticket list search and archive-mode selection
are pure helpers and do not depend on React.
