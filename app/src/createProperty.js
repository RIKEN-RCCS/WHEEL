import ejs from 'ejs/ejs';
//TODO jsonPropertyのvalidation checkをclassにつける
//
let template=`
<h2> <% this.name %> </h2>
<% if(this.description != null){ %>
<input type="text" value="<% description %>" class="text_box property_text" spellcheck="false">;
<% } %>
`;

export default function(node) {
  console.log(node);
  let html = ejs.render(template, node);
  console.log(html);
  return html;
}
