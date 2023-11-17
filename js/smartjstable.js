
String.prototype.interpolate = function (params) {
    const names = Object.keys(params);
    const vals = Object.values(params);
    return new Function(...names, `return \`${this}\`;`)(...vals);
}

const smartjstable = {
    tableData: {},
    create: function (tableID, paramaters) {
        smartjstable.tableData[tableID] = {}
        smartjstable.tableData[tableID]["parameters"] = paramaters
        smartjstable.tableData[tableID].data = []
        if (paramaters.columns.length > 0 && paramaters.columns[0].name) {

            const el = document.getElementById(tableID);

            let theadData = ``;
            paramaters.columns.forEach(function (columndata, index) {
                theadData += `<th class="sjt_th" c="${index}">${columndata.name}</th>`;
            })

            let controlData = ``;
            if (paramaters.search.show) {
                controlData += `<input type="text" id="sjt_search_${tableID}" class="sjt_search ${paramaters.css.search}" minlength="${paramaters.search.minLength}" placeholder="${paramaters.search.placeholder}">`;
            }

            if (paramaters.export.excel) {
                controlData += `<button type="button" id="sjt_exportExcel_${tableID}" class="sjt_exportButton ${paramaters.css.exportButton}">EXCEL</button>`;
            }

            if (paramaters.export.pdf) {
                controlData += `<button type="button" id="sjt_exportPDF_${tableID}" class="sjt_exportButton ${paramaters.css.exportButton}">PDF</button>`;
            }

            let tableHtml = `
            <div id="sjt_header_${tableID}" class="sjt_control">
            ${controlData}
            </div>
            <table id="sjt_table_${tableID}" class="table ${paramaters.css.table}">
                <thead class="${paramaters.css.thead}">
                    <tr>
                        ${theadData}
                    </tr>
                </thead>
                <tbody id="sjt_table_body_${tableID}">
                </tbody>
            </table>
            <div id="sjt_footer_${tableID}" class="sjt_control_footer">
            </div>
            `;
            el.innerHTML = tableHtml
            if (paramaters.search.show) {
                document.getElementById("sjt_search_" + tableID).addEventListener("keyup", _sjtSearchKey)
            }
            if (paramaters.export.excel) {
                document.getElementById("sjt_exportExcel_" + tableID).addEventListener("click", _sjtExportExcel)
            }
            if (paramaters.export.pdf) {
                document.getElementById("sjt_exportPDF_" + tableID).addEventListener("click", _sjtExportPDF)
            }
            smartjstable.tableData[tableID]["created"] = true
            return true
        } else {
            return false
        }
    },
    show: function (tableID, tableData) {
        if (smartjstable.tableData[tableID]["created"]) {
            if (typeof tableData == "object") {
                if (smartjstable.tableData[tableID].parameters.columns.length > 0) {
                    smartjstable.tableData[tableID].data = tableData
                    _sjtShowRow(tableID, tableData)
                    return true
                } else {
                    return false
                }
            } else {
                return false
            }

        } else {
            return false
        }

    },

}

_sjtFilter = function (rawData, search, keys) {
    var lowSearch = search.toLowerCase();
    return rawData.filter(raw =>
        keys.some(key =>
            String(raw[key]).toLowerCase().includes(lowSearch)
        )
    );
}

function _sjtSearchKey(input) {
    if (input.target.id.search("sjt_search") >= 0) {
        let searchVal = input.target.value
        const tableID = input.target.id.split("_")[2];

        if (smartjstable.tableData[tableID] && smartjstable.tableData[tableID]["created"]) {
            if (searchVal.length >= input.target.minLength) {
                let dataKey = Object.keys(smartjstable.tableData[tableID].data[0])
                let rowData = _sjtFilter(smartjstable.tableData[tableID].data, searchVal, dataKey)
                _sjtShowRow(tableID, rowData)

            } else if (searchVal.length == 0) {
                _sjtShowRow(tableID, smartjstable.tableData[tableID].data)
            }
        }

    }
}

function _sjtShowRow(tableID, tableData) {
    {
        if (smartjstable.tableData[tableID]["created"]) {
            if (typeof tableData == "object") {
                if (smartjstable.tableData[tableID].parameters.columns.length > 0) {

                    document.getElementById("sjt_table_body_" + tableID).innerHTML = '';

                    for (let i = 0; i < tableData.length; i++) {
                        let rowHtml = `<tr id="${i}">`;
                        if (smartjstable.tableData[tableID].parameters.pagination.show) {
                            rowHtml = `<tr id="${i}" class="sjt_dnone">`;
                        }

                        smartjstable.tableData[tableID].parameters.columns.forEach(function (columndata) {
                            switch (columndata.type) {
                                case "index":
                                    rowHtml += `<td>${i}</td>`
                                    break;
                                case "text":
                                    if (tableData[i][columndata.key]) {
                                        rowHtml += `<td>${tableData[i][columndata.key]}</td>`
                                    } else {
                                        rowHtml += `<td></td>`
                                    }
                                    break;
                                case "dateTime":
                                    const d = new Date(tableData[i][columndata.key]).toLocaleString()
                                    if (d != "Invalid Date") {
                                        rowHtml += `<td>${d}</td>`
                                    } else {
                                        rowHtml += `<td></td>`
                                    }
                                    break;
                                case "template":
                                    try {
                                        const template = columndata.template.interpolate(tableData[i]);
                                        rowHtml += `<td>${template}</td>`
                                    } catch (error) {
                                        rowHtml += `<td></td>`
                                    }
                                    break;
                                default:
                                    rowHtml += `<td></td>`
                                    break;
                            }
                        })
                        rowHtml += "</tr>"
                        document.getElementById("sjt_table_body_" + tableID).innerHTML += rowHtml;



                    }
                    if (smartjstable.tableData[tableID].parameters.pagination.show) {
                        _sjtPagination(tableID)
                    }
                } else {
                    console.log("*smartjstable not column*")
                }
            } else {
                console.log("*smartjstable table data not json*")
            }
        } else {
            console.log("*smartjstable not created*")
        }
    }
}

function _sjtPagination(tableID) {
    if (!smartjstable.tableData[tableID].parameters.pagination.perPage) {
        smartjstable.tableData[tableID].parameters.pagination.perPage = 100
    }

    var table = document.getElementById("sjt_table_body_" + tableID);
    var rows = table.rows;
    var pageCount = Math.ceil(rows.length / smartjstable.tableData[tableID].parameters.pagination.perPage);
    document.getElementById("sjt_footer_" + tableID).innerHTML = ""
    for (var i = 0; i < pageCount; i++) {
        var button = document.createElement("button");
        button.innerHTML = i + 1;
        button.classList.add("sjtPaginationButton")
        if (smartjstable.tableData[tableID].parameters.css.paginationButton.length > 0) {
            button.classList.add(smartjstable.tableData[tableID].parameters.css.paginationButton)
        }
        button.setAttribute("table", tableID);
        button.setAttribute("page", i + 1);
        button.setAttribute("onclick", "_sjtShowPage(this)")
        document.getElementById("sjt_footer_" + tableID).appendChild(button)
    }
    _sjtShowPage(1, tableID)

}

function _sjtShowPage(btn, tableID) {
    var tID = ""
    var page = 1
    if (tableID) {
        tID = tableID
        if (typeof btn == "number") {
            page = btn
        }

    } else {
        if (btn.attributes.table.nodeValue) {
            tID = btn.attributes.table.nodeValue
        }
        if (btn.attributes.page.nodeValue) {
            page = btn.attributes.page.nodeValue
        }
    }

    if (smartjstable.tableData[tID]) {
        var table = document.getElementById("sjt_table_body_" + tID);
        var rows = table.rows;
        for (var i = 0; i < rows.length; i++) {
            rows[i].classList.add("sjt_dnone");
        }
        let rowsPerPage = smartjstable.tableData[tID].parameters.pagination.perPage

        for (var i = (page - 1) * rowsPerPage; i < page * rowsPerPage; i++) {
            if (rows[i]) {
                rows[i].classList.remove("sjt_dnone");
            }
        }
    }

}

function _sjtExportExcel(input) {
    if (input.target.id.search("sjt_exportExcel") >= 0) {
        const tableID = input.target.id.split("_")[2];

        var table2excel = new Table2Excel();
        table2excel.export(document.getElementById("sjt_table_" + tableID));
    }
}

function _sjtExportPDF(input) {
    if (input.target.id.search("sjt_exportPDF") >= 0) {
        const tableID = input.target.id.split("_")[2];

        var table = document.getElementById("sjt_table_body_" + tableID);
        var rows = table.rows;
        for (var i = 0; i < rows.length; i++) {
            rows[i].classList.remove("sjt_dnone");
        }

        const tablePDF = document.getElementById("sjt_table_" + tableID);
        html2pdf(tablePDF);
        setTimeout(() => {
            if (smartjstable.tableData[tableID].parameters.pagination.show) {
                _sjtShowPage(1, tableID)
            }
        }, 2000);

    }
}




