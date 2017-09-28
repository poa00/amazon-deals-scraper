const CDP = require('chrome-remote-interface');
const fs = require("fs")

CDP((client) => {
  // Extract used DevTools domains.
  const { Page, Runtime } = client;

  // Enable events on domains we are interested in.
  Promise.all([
    Page.enable()
  ]).then(() => {
    return Page.navigate({ url: 'https://www.amazon.com/gp/goldbox' });
  });

  // Evaluate outerHTML after page has loaded.
  Page.loadEventFired(() => {

    injectjQuery(Runtime);

    Runtime.evaluate({ expression: "window.scrollTo(0, document.body.scrollHeight)" });

    var expression = `
      (function(){
        var items = jQuery("div.a-row.dealContainer.dealTile");
        var deals = [];
        items.each(function(i,v){
            var item = { 
                name: jQuery(v).find("#dealTitle").text().trim(),
                ends:jQuery(v).find("span[id*='dealClock']").text().trim(),
                price:jQuery(v).find("div.a-row.priceBlock.unitLineHeight > span").text().trim()
            };
            deals[i] = item
        });
        return deals;
    })();
    `;

    setTimeout(function () {
      Runtime.evaluate({ expression: expression, returnByValue:true }).then((a) => {
        writeToFile(JSON.stringify(a.result.value));
        console.log(a.result.value.length);
        //console.log(a.result.value);
        client.close();
      });
    }, 4000);
  });
}).on('error', (err) => {
  console.error('Cannot connect to browser:', err);
});

function injectjQuery(Runtime) {
  Runtime.evaluate({
    expression: `var jq = document.createElement('script');
  jq.src = \"https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js\";
  document.getElementsByTagName('head')[0].appendChild(jq);
  jQuery.noConflict();` })
}

function writeToFile(content) {
  fs.writeFile("result.js", content, function (error) {
    if (error != null) {
      console.log(error);
    } else {
      console.log("OutputFile.txt has been saved...");
    }
  });
}