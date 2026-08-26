# Profile Pictures Package

This package owns authenticated profile-picture retrieval, URL validation,
bounded downloads, redirect validation, and positive/negative caching. It
depends on a narrow `ProfilePictureUrlProvider` contract rather than importing
the WhatsApp client service. The WhatsApp integration supplies that provider at
composition time.
