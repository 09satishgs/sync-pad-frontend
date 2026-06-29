/**
 * Helper to download sheet content in Text or HTML formats.
 * @param {string} title - Sheet title
 * @param {string} rawContent - Raw Quill HTML content
 * @param {"text"|"html"} type - Format to download
 */
export const handleDownload = (title, rawContent, type) => {
  const fileTitle = title || 'untitled';
  const content = rawContent || '';

  let fileContent = '';
  let mimeType = '';
  let fileExtension = '';

  if (type === 'text') {
    // Replace br tags with newlines
    let formatted = content.replace(/<br\s*\/?>/gi, '\n');
    // Replace paragraph and list item closing tags with newlines
    formatted = formatted.replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n');
    // Strip other HTML tags
    formatted = formatted.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    const tempEl = document.createElement('div');
    tempEl.innerHTML = formatted;
    fileContent = tempEl.textContent || tempEl.innerText || '';
    mimeType = 'text/plain;charset=utf-8';
    fileExtension = 'txt';
  } else {
    fileContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0a0a0c;
      color: #e4e4e7;
      line-height: 1.6;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      border-bottom: 1px solid #27272a;
      padding-bottom: 0.5rem;
      color: #fafafa;
    }
  </style>
</head>
<body>
  <h1>${fileTitle}</h1>
  <div>${content}</div>
</body>
</html>`;
    mimeType = 'text/html;charset=utf-8';
    fileExtension = 'html';
  }

  const blob = new Blob([fileContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${fileExtension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
