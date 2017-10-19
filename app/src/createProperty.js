import ejs from 'ejs/ejs';

//TODO クライアントサイドでvalidationが必要なら jquery pluginを導入する
//http://jqueryvalidation.org/
function createStringInputField(varName){
  return `
<% if(typeof ${varName} !== 'undefined'){ %>
  <p>${varName}</p>
  <input type="text" value="<%= ${varName} %>" spellcheck="false" id="${varName}InputFiled">
<% } %>
`;
}
function createNumberInputField(varName, min){
  var template=`
<% if(typeof ${varName} !== 'undefined'){ %>
  <p>${varName}</p>
  <input type="number" value="<%= ${varName} %>" id="${varName}InputFiled" `;
  if(min != null){
    template += `min=${min}`;
  }
  template += `>
<% } %>`;
  return template;
}
function createInOutFilesSnipet(varName){
  return `
<p>${varName}</p>
<% ${varName}.forEach(function(v, i){ %>
  <input type="text" value="<%= v %>" disabled><button class="${varName}DelBtn">delete<button>
<% }) %>
<input type="text" spellcheck="false" id="${varName}InputField"><button id="${varName}AddBtn">add</button>
`;
}
function createCleanupFlagSnipet(){
  return `
<p>
  <input type="radio" name="cleanupFlag" value=0>clean up
  <input type="radio" name="cleanupFlag" value=1>keep files
  <input type="radio" name="cleanupFlag" value=2 checked=>follow parent setting
</p>
`;
}


export default function(node) {
  console.log(node);
  let template = '<h2> <%= name %> </h2>';
  template += createStringInputField('description');
  template += createStringInputField('script');
  template += createInOutFilesSnipet('inputFiles');
  template += createInOutFilesSnipet('outputFiles');
  template += createCleanupFlagSnipet();
  template += createNumberInputField('maxSizeCollection', 0);
  template += createNumberInputField('start');
  template += createNumberInputField('end');
  template += createNumberInputField('step');
  template += createStringInputField('condition');

  let html = ejs.render(template, node);
  return html;
}
