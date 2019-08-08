// @Hack: We are putting everything inside one giant json file. We should separate them into files so we can dinamically load from the webserver exactly the monsters and items that the user is searching for.
var mediviadb;

var loottable;
var loottable_lastitemid;

function init() {
    // Since fetch is async, we should only use the db after the init function returns
    fetch("./db.json")
    .then((resp) => resp.json())
    .then(function(data) {
        mediviadb = data;
    });
    loottable_lastitemid = 0;
    loottable = document.getElementById("loottb");
    loottable_add_row();
}

function loottable_add_row() {
    let row_id = "loottb_item" + loottable_lastitemid;
    loottable.getElementsByTagName("tbody")[0].innerHTML += '<tr id="' + row_id + '"><td><input type="text" id="' + row_id + '_itemname"></td><td><input type="text" id="' + row_id + '_itemquantity"></td><td><input type="text" id="' + row_id + '_itemprice"></td></tr>';
    loottable_lastitemid++;
}

function loottable_clear() {
    loottable.getElementsByTagName("tbody")[0].innerHTML = "";
    loottable_lastitemid = 0;
    loottable_add_row();

    var gold_quant = document.getElementById("loottb_gold_itemquantity");
    gold_quant.value = "";
    gold_quant.focus();
}