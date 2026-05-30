const EMAIL_TEMPLATES = {
  welcome: {
    label: 'Welcome Email',
    file: '/email-templates/welcome.html',
    subject: 'Welcome to Intrinsic Therapeutic Solutions',
    description: 'Introduces the client to the program with their name, PIN, and app link.',
    variables: ['first_name', 'last_name', 'pin', 'app_link'],
  },
  pin_reset: {
    label: 'PIN Reset',
    file: '/email-templates/pin-reset.html',
    subject: 'Your PIN Has Been Updated',
    description: 'Notifies the client that their PIN has been changed.',
    variables: ['first_name', 'last_name', 'pin', 'app_link'],
  },
  reengagement: {
    label: 'Re-engagement',
    file: '/email-templates/reengagement.html',
    subject: 'We Miss You — Continue Your Healing Journey',
    description: 'Encourages inactive clients to return to the program.',
    variables: ['first_name', 'last_name', 'app_link'],
  },
};

async function loadTemplate(templateId) {
  const template = EMAIL_TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown template: ${templateId}`);

  const response = await fetch(template.file);
  if (!response.ok) throw new Error(`Template file not found: ${template.file}`);

  const html = await response.text();
  return html;
}

function renderTemplate(html, variables = {}) {
  let rendered = html;
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(pattern, value || '');
  });
  return rendered;
}

async function getRenderedEmail(templateId, variables = {}) {
  const html = await loadTemplate(templateId);
  const rendered = renderTemplate(html, variables);
  const template = EMAIL_TEMPLATES[templateId];
  return {
    subject: template.subject,
    html: rendered,
  };
}

function getAvailableTemplates() {
  return Object.entries(EMAIL_TEMPLATES).map(([id, t]) => ({
    id,
    label: t.label,
    subject: t.subject,
    description: t.description,
    variables: t.variables,
  }));
}

export { EMAIL_TEMPLATES, loadTemplate, renderTemplate, getRenderedEmail, getAvailableTemplates };
