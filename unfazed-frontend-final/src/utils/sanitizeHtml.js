const ALLOWED_TAGS = new Set(['p','br','strong','b','em','i','u','s','ul','ol','li','blockquote','h1','h2','h3','h4','a']);
const ALLOWED_ATTRS = new Set(['href','target','rel']);

export function sanitizeHtml(input = '') {
  if (typeof input !== 'string' || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(input, 'text/html');
  const walk = (node) => {
    [...node.children].forEach((element) => {
      const tag = element.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        const parent = element.parentNode;
        while (element.firstChild) parent.insertBefore(element.firstChild, element);
        element.remove();
        return;
      }
      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        if (!ALLOWED_ATTRS.has(name) || (name === 'href' && !/^https?:\/\//i.test(value))) element.removeAttribute(attribute.name);
      });
      if (tag === 'a') {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer nofollow');
      }
      walk(element);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
