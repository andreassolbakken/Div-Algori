'use strict';

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBlock(block) {
  switch (block.type) {
    case 'title':
      return `<div class="ct-title">
        <h1>${esc(block.main)}</h1>
        <div class="ct-subtitle">${esc(block.subtitle)}</div>
        <div class="ct-subsubtitle">${esc(block.subsubtitle)}</div>
      </div>`;

    case 'paragraph':
      return `<p class="ct-para">${esc(block.text)}</p>`;

    case 'h2':
      return `<h2 class="ct-h2">${esc(block.text)}</h2>`;

    case 'h3':
      return `<h3 class="ct-h3">${esc(block.text)}</h3>`;

    case 'bullets':
      return `<ul class="ct-list">${block.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;

    case 'table': {
      const hasHeader = !!block.header;
      const isKeyVal = !hasHeader;
      let html = `<table class="ct-table">`;
      if (hasHeader) {
        html += `<thead><tr>${block.header.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>`;
      }
      html += '<tbody>';
      for (const row of block.rows) {
        html += `<tr>${row.map((c, i) =>
          (isKeyVal && i === 0) ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`
        ).join('')}</tr>`;
      }
      html += '</tbody></table>';
      return html;
    }

    case 'signature_block':
      return ''; // rendered separately in sign.html

    case 'attachments':
      return `<div class="ct-attachments">
        <h2 class="ct-h2">Vedlegg</h2>
        <p class="ct-para"><em>Vedleggene vil bli utarbeidet og lagt ved separat.</em></p>
      </div>`;

    default:
      return '';
  }
}

function renderContractHtml(blocks) {
  return blocks.map(renderBlock).join('\n');
}

module.exports = { renderContractHtml };
