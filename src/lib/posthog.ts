import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;

if (key) {
  posthog.init(key, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: false,
  });
}

export { posthog };

export function track(event: string, properties?: Record<string, unknown>) {
  if (!key) return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, properties: {
  display_name: string | null;
  username: string;
  spirit_bird: string | null;
}) {
  if (!key) return;
  posthog.identify(userId, {
    display_name: properties.display_name,
    username: properties.username,
    spirit_bird: properties.spirit_bird,
  });
}
