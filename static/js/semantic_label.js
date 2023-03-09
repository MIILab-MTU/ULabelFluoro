index = 0
zoom = 0
console.log(typeof(subjects_list))
subject_num = subjects_list.length
console.log(subject_num)
Labels_Name = ["LAD","R1","D1","D2","LCX","OM1","OM2","LMA",
               "RMA","PDA","PLB"]
Labels_Color_Map = new Array
Labels_Color_Map["LAD"] = "#f58f98"
Labels_Color_Map["R1"] = "#73b9a2"
Labels_Color_Map["D1"] = "#f2eada"
Labels_Color_Map["D2"] = "#f47a55"

Labels_Color_Map["LCX"] = "#f26522"
Labels_Color_Map["OM1"] = "#1d953f"
Labels_Color_Map["OM2"] = "#6f599c"

Labels_Color_Map["LMA"] = "#bed742"
Labels_Color_Map["RMA"] = "#f58f98"

Labels_Color_Map["PDA"] = "#bed742"
Labels_Color_Map["PLB"] = "#1d953f"


Semantic_Labels = []
$("#polygonLabels").empty()

label_names = []
semantic_labelX = []
semantic_labelY = []

var pointsDataX = []
var pointsDataY = []
var Label_X
var Label_Y
var canvas = document.getElementById("canvas")
var ctx = canvas.getContext("2d")


auto_draw(0)

$(".refreshBtn").on('click', function () {
    auto_draw(0)
    zoom = 0
    fill_num = 0
})

$(".nextimgBtn").on('click', function () {
    if (index < subject_num - 1) {
        index = index + 1
        auto_draw(0)
        label_names = []
        Semantic_Labels = []
        $("#polygonLabels").empty()
        semantic_labelX = []
        semantic_labelY = []
        zoom = 0
    }
})

$(".previmgBtn").on('click', function () {
    if (index > 0) {
        index = index - 1
        auto_draw(0)
        label_names = []
        Semantic_Labels = []
        $("#polygonLabels").empty()
        semantic_labelX = []
        semantic_labelY = []
        zoom = 0
    }
})

$("#display").on('load', function () {
    var obj = $(this)
    if (obj.width() < $(".frame-middle").width()) {
        $("canvas").css('left', `calc(50% - ${$("#display").width() / 2 + 'px'})`)
        $("#display").css('left', `calc(50% - ${$("#display").width() / 2 + 'px'})`)
    } else {
        $("#canvas").css('left', '')
        $("#display").css('left', '')
    }
    if (obj.height() < $(".frame-middle").height()) {
        $("canvas").css('top', `calc(50% - ${$("#display").height() / 2 + 'px'})`)
        $("#display").css('top', `calc(50% - ${$("#display").height() / 2 + 'px'})`)
    } else {
        $("#canvas").css('top', '')
        $("#display").css('top', '')
    }
})


fill_num = 0
var fillArea_x = []
var fillArea_y = []
var oldx
var oldy
var newx
var newy
$(".fillAreaBtn").on('click', function () {
    if (fill_num == 0) {
        fill_num = 1
        resetzoom(zoom, 0)
    } else {
        fill_num = 0
    }
    if (fill_num == 1) {
        var canvas = document.getElementById("canvas")
        var ctx = canvas.getContext("2d")
        var flag = false
        var linecolor = "yellow"
        var linw = 1
        oldx = -10
        oldy = -10
        newx = -10
        newy = -10

        canvas.onmousedown = function (evt) {
            if (fill_num == 1) {
                ctx.globalCompositeOperation = "source-over"
                var evt = window.event || evt;
                newx = evt.offsetX;
                newy = evt.offsetY;
                newx = transpoint(zoom, newx)
                newy = transpoint(zoom, newy)
                fillArea_x.push(newx)
                fillArea_y.push(newy)
                ctx.fillStyle = 'yellow'
                ctx.fillRect(newx, newy, 1, 1)
            }
        }
        canvas.onmouseup = function () {
            if (fill_num == 1) {
                if (fillArea_x.length == 1) {
                    first_x = newx
                    first_y = newy
                    ctx.fillStyle = 'yellow'
                    ctx.beginPath()
                    ctx.moveTo(first_x, first_y)
                } else {
                    ctx.lineTo(newx, newy)
                    ctx.strokeStyle = linecolor
                    ctx.lineWidth = linw
                    ctx.lineCap = "square"
                    ctx.stroke()
                    flag = true
                }
                oldx = newx
                oldy = newy
                if (flag) {
                    if (Math.abs(oldx - first_x) < 5 && Math.abs(oldy - first_y) < 5 && fillArea_x.length > 2) {
                        oldx = -10
                        oldy = -10
                        fillArea_x = []
                        fillArea_y = []
                        ctx.globalCompositeOperation = "source-atop"
                        ctx.closePath()
                        ctx.fillStyle = 'yellow'
                        ctx.fill()
                        $('#myModal').modal({
                            backdrop: "static"
                        })
                        flag = false
                    }
                }
            }
        }
    }
})

$('#CancelBtn').on('click', function () {
    $('#myModal').modal('hide')
    $('#myModal input').val('')
    resetzoom(zoom, 0)
})

$('#saveNameBtn').on('click', function () {
        var name = $('#myModal input').val()
        $('#myModal').modal('hide')
        $('#myModal input').val('')
        label_names.push(name)
        semantic_labelX = []
        semantic_labelY = []
        var oImg = ctx.getImageData(0, 0, document.getElementById("canvas").width, document.getElementById("canvas").height);
        for (var i = 0; i < Label_X.length; i++) {
            if (list_the_same(getXY(oImg, Label_X[i], Label_Y[i]), [255, 255, 0, 255])) {
                semantic_labelX.push(Label_X[i])
                semantic_labelY.push(Label_Y[i])
            }
        }
        insertOrUpdate(Semantic_Labels, "label", name, ["X", "Y"], [semantic_labelX, semantic_labelY])
        resetzoom(zoom, 0)
    }
)

$(".saveAllBtn").on('click', function () {
        for (var i = 0; i < Labels_Name.length; i++) {
            insertOrUpdate(Semantic_Labels, "label", Labels_Name[i], ["X", "Y"], [[], []])
        }
        $.ajax({
            type: 'POST',
            url: window.save_semantic_labels_url,
            data: {
                "file_dir": file_dir,
                "subject": subjects_list[index],
                "index": indexes_list[index],
                "Labels": JSON.stringify(Semantic_Labels),
                "img_x": document.getElementById("canvas").width,
                "img_y": document.getElementById("canvas").height,
            },
            dataType: 'JSON',
            async: false,
            traditional: true,
            success: function (resdata) {
                if (index < subject_num - 1) {
                    index = index + 1
                    auto_draw(0)
                    label_names = []
                    Semantic_Labels = []
                    $("#polygonLabels").empty()
                    semantic_labelX = []
                    semantic_labelY = []
                    zoom = 0
                    fill_num = 0
                }
            }
        })
    }
)

$(".zoomIn").on('click', function () {
        zoomIn()
        zoom = zoom + 1
        resetlocation()
    }
)

$(".zoomOut").on('click', function () {
        zoomOut()
        zoom = zoom - 1
        resetlocation()
    }
)
$(".undoBtn").on('click', function () {
    ctx.clearRect(0, 0, 512, 512)
    ctx.fillStyle = "#ff0000";
    for (var i = 0; i < Label_X.length; i++) {
        ctx.fillRect(Label_X[i], Label_Y[i], 1, 1);
    }
    ctx.fillStyle = "#ffff00";
    fillArea_x.pop()
    fillArea_y.pop()
    if (fillArea_x.length == 0) {
        oldx = -10
        oldy = -10
        newx = -10
        newy = -10
        fillArea_x = []
        fillArea_y = []
    } else {
        ctx.fillRect(fillArea_x[0], fillArea_y[0], 1, 1)
        ctx.beginPath()
        ctx.moveTo(fillArea_x[0], fillArea_y[0])
        for (var i = 1; i < fillArea_x.length; i++) {
            ctx.fillRect(fillArea_x[i], fillArea_y[i], 1, 1)
            ctx.lineTo(fillArea_x[i], fillArea_y[i])
            ctx.stroke()
        }
    }
})


function Get_pixels_index(color) {
    All = []
    DataX = []
    DataY = []
    var oImg = ctx.getImageData(0, 0, document.getElementById("canvas").width, document.getElementById("canvas").height);
    for (i = 0; i < document.getElementById("canvas").width; i++) {
        for (j = 0; j < document.getElementById("canvas").height; j++) {
            if (list_the_same(getXY(oImg, i, j), color)) {
                DataX.push(i)
                DataY.push(j)
            }
        }
    }
    All.push(DataX)
    All.push(DataY)
    return All
}

function list_the_same(list1, list2) {
    var cal = 0
    for (q = 0; q < 4; q++) {
        if (list1[q] == list2[q]) {
            cal++
        }
    }
    if (cal == 4) {
        return true
    } else {
        return false
    }
}

function getXY(obj, x, y) {
    var color = [];
    color[0] = obj.data[4 * (obj.width * y + x)];
    color[1] = obj.data[4 * (obj.width * y + x) + 1];
    color[2] = obj.data[4 * (obj.width * y + x) + 2];
    color[3] = obj.data[4 * (obj.width * y + x) + 3];
    return color;
}

function zoomIn() {
    $("#display").css({
        'width': Math.floor($("#display").width() / 0.8),
        'height': Math.floor($("#display").height() / 0.8)
    })
    $("#canvas").css({
        'width': Math.floor($("#canvas").width() / 0.8),
        'height': Math.floor($("#canvas").height() / 0.8)
    })
}

function zoomOut() {
    $("#display").css({
        'width': Math.floor($("#display").width() * 0.8),
        'height': Math.floor($("#display").height() * 0.8)
    })
    $("#canvas").css({
        'width': Math.floor($("#canvas").width() * 0.8),
        'height': Math.floor($("#canvas").height() * 0.8)
    })
}

function transpoint(zoomid, tr) {
    if (zoomid >= 0) {
        for (var i = 0; i < zoom; i++) {
            tr = tr * 0.8
        }
    } else {
        for (var i = 0; i < -zoom; i++) {
            tr = tr / 0.8
        }
    }
    return tr;
}


function auto_draw(p) {
    for (var i = 0; i < Semantic_Labels.length; i++) {
        document.getElementById(Semantic_Labels[i]["label"]).checked = false
    }
    $("#fileList").empty()
    for (var i = 0; i < subjects_list.length; i++) {
        $("#fileList").append(`<li><input id = "${subjects_list[i]}"  type="checkbox" class="opt" onclick="testClick(this)"/>  ${subjects_list[i]}</li>`)
        if (index == i) {
            document.getElementById(subjects_list[i]).checked = true
        } else {
            document.getElementById(subjects_list[i]).checked = false
        }
    }
    if (p == 0) {
        $.ajax({
            type: 'GET',
            url: window.get_predicted_data_url,
            data: {
                "file_dir": file_dir,
                "subject": subjects_list[index],
                "index": indexes_list[index],
            },
            dataType: 'JSON',
            async: false,
            traditional: true,
            success: function (resdata) {
                Label_X = resdata.pointsY
                Label_Y = resdata.pointsX
                shape0 = resdata.shape0
                shape1 = resdata.shape1
                $("#display").css({
                    'width': Math.floor(shape0),
                    'height': Math.floor(shape1)
                })
                $("#canvas").css({
                    'width': Math.floor(shape0),
                    'height': Math.floor(shape1)
                })
                document.getElementById("canvas").width = shape0
                document.getElementById("canvas").height = shape1
                var imgurl = file_dir + "/" + subjects_list[index] + "/images/" + indexes_list[index] + ".png"
                console.log(imgurl)
                $(".frame-middle p").html(`<span>${subjects_list[index]}</span> （<span id="index">${indexes_list[index]}</span>）`)
                document.getElementById("display").src = imgurl;
                get_angleinfor()
                ctx.fillStyle = "#ff0000";
                for (var i = 0; i < resdata.pointsX.length; i++) {
                    ctx.fillRect(resdata.pointsY[i], resdata.pointsX[i], 1, 1);
                }
            }
        })
    } else {
        $.ajax({
            type: 'GET',
            url: window.get_predicted_data_url,
            data: {
                "file_dir": file_dir,
                "subject": subjects_list[index],
                "index": indexes_list[index],
            },
            dataType: 'JSON',
            async: false,
            traditional: true,
            success: function (resdata) {
                shape0 = resdata.shape0
                shape1 = resdata.shape1
                all = Get_pixels_index([255, 0, 0, 255])
                pointsDataX = all[0]
                pointsDataY = all[1]
                $("#display").css({
                    'width': Math.floor(shape0),
                    'height': Math.floor(shape1)
                })
                $("#canvas").css({
                    'width': Math.floor(shape0),
                    'height': Math.floor(shape1)
                })
                document.getElementById("canvas").width = shape0
                document.getElementById("canvas").height = shape1
                var imgurl = file_dir + "/" + subjects_list[index] + "/images/" + indexes_list[index] + ".png"
                $(".frame-middle p").html(`<span>${subjects_list[index]}</span> （<span id="index">${indexes_list[index]}</span>）`)
                document.getElementById("display").src = imgurl;
                get_angleinfor()
                ctx.fillStyle = "#ff0000";
                for (var i = 0; i < pointsDataX.length; i++) {
                    ctx.fillRect(pointsDataX[i], pointsDataY[i], 1, 1);
                }
            }
        })
    }
}

function resetzoom(zoomid, pid) {
    getScollPostion()
    if (zoomid > 0) {
        auto_draw(pid)
        for (var i = 0; i < zoom; i++) {
            zoomIn()
        }
    } else {
        auto_draw(pid)
        for (var i = 0; i < -zoom; i++) {
            zoomOut()
        }
    }
    setScollPostion()
}

function resetlocation() {
    if ($("#display").width() < $(".frame-middle").width()) {
        $("canvas").css('left', `calc(50% - ${$("#display").width() / 2 + 'px'})`)
        $("#display").css('left', `calc(50% - ${$("#display").width() / 2 + 'px'})`)
    } else {
        $("#canvas").css('left', '')
        $("#display").css('left', '')
    }
    if ($("#display").height() < $(".frame-middle").height()) {
        $("canvas").css('top', `calc(50% - ${$("#display").height() / 2 + 'px'})`)
        $("#display").css('top', `calc(50% - ${$("#display").height() / 2 + 'px'})`)
    } else {
        $("#canvas").css('top', '')
        $("#display").css('top', '')
    }
}

function insertOrUpdate(array, keyName, keyVal, fieldNames, fieldVals) {
    var hasExist = false;
    var len = array.length;
    for (var i = 0; i < len; i++) {
        if (array[i][keyName] && array[i][keyName] == keyVal) {
            hasExist = true;
            for (var j = 0; j < fieldNames.length; j++) {
                array[i][fieldNames[j]] = array[i][fieldNames[j]].concat(fieldVals[j]);
            }
        }
    }
    if (!hasExist) {
        $("#polygonLabels").append(`<li>
        <input id= "${keyVal}" type="checkbox" class="opt" onclick="SemanticTestClick(this)">${keyVal}
        <button id= "${keyVal}_del" onclick="deletelabel(this)">delete</button>
        <button id= "${keyVal}_re" onclick="renamelabel(this)">rename</button>
        </li>`)
        array[len] = {};
        array[len][keyName] = keyVal;
        for (var k = 0; k < fieldNames.length; k++) {
            array[len][fieldNames[k]] = fieldVals[k];
        }
    }
}

$(document).keydown(function (event) {
    if (event.keyCode == 68) {
        zoomIn()
        zoom = zoom + 1
        resetlocation()
    }
    if (event.keyCode == 65) {
        zoomOut()
        zoom = zoom - 1
        resetlocation()
    }
    if (event.keyCode == 83) {

        ctx.clearRect(0, 0, 512, 512)
        ctx.fillStyle = "#ff0000";
        for (var i = 0; i < Label_X.length; i++) {
            ctx.fillRect(Label_X[i], Label_Y[i], 1, 1);
        }
        ctx.fillStyle = "#ffff00";
        fillArea_x.pop()
        fillArea_y.pop()
        if (fillArea_x.length == 0) {
            oldx = -10
            oldy = -10
            newx = -10
            newy = -10
            fillArea_x = []
            fillArea_y = []
        } else {
            ctx.fillRect(fillArea_x[0], fillArea_y[0], 1, 1)
            ctx.beginPath()
            ctx.moveTo(fillArea_x[0], fillArea_y[0])
            for (var i = 1; i < fillArea_x.length; i++) {
                ctx.fillRect(fillArea_x[i], fillArea_y[i], 1, 1)
                ctx.lineTo(fillArea_x[i], fillArea_y[i])
                ctx.stroke()
            }
        }
    }
    if (event.keyCode == 87){ //w
        if (document.getElementById(subjects_list[index]).checked == true){
            document.getElementById(subjects_list[index]).checked = false
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        else {
            document.getElementById(subjects_list[index]).checked = true
            ctx.fillStyle = "#ff0000";
            for (var i = 0; i < Label_X.length; i++) {
                ctx.fillRect(Label_X[i], Label_Y[i], 1, 1);
            }
        }
    }
})

function testClick(obj) {
    var that = obj;
    if (that.checked == false) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    } else {
        for (var i = 0; i < subject_num; i++) {
            if (that.id == subjects_list[i]) {
                index = i
                break
            }
        }
        auto_draw(0)
        zoom = 0
        for (var i = 0; i < Semantic_Labels.length; i++) {
            document.getElementById(Semantic_Labels[i]["label"]).checked = false
        }
    }
}

function SemanticTestClick(obj) {
    var that = obj;
    if (that.checked == false) {
        ctx.fillStyle = "#FF0000"
        for (var i = 0; i < Semantic_Labels.length; i++) {
            if (document.getElementById(Semantic_Labels[i]["label"]).id == Semantic_Labels[i]["label"]) {
                for (var p = 0; p < Semantic_Labels[i]["X"].length; p++) {
                    ctx.fillRect(Semantic_Labels[i]["X"][p], Semantic_Labels[i]["Y"][p], 1, 1)
                }
            }
        }
    }
    for (var i = 0; i < Semantic_Labels.length; i++) {
        if (document.getElementById(Semantic_Labels[i]["label"]).checked == true) {
            ctx.fillStyle = Labels_Color_Map[Semantic_Labels[i]["label"]]
            for (var p = 0; p < Semantic_Labels[i]["X"].length; p++) {
                ctx.fillRect(Semantic_Labels[i]["X"][p], Semantic_Labels[i]["Y"][p], 1, 1)
            }
        }
    }
}

function deletelabel(obj) {
    var that = obj;
    for (var i = 0; i < Semantic_Labels.length; i++) {
        if (that.id.substring(0, that.id.length - 4) == Semantic_Labels[i]["label"]) {
            deleteindex = i
            break
        }
    }
    Semantic_Labels.splice(deleteindex, 1)
    that.parentNode.remove();
    auto_draw(0)
    zoom = 0
}

var updateindex

function renamelabel(obj) {
    var that = obj;
    console.log(that.id)
    for (var i = 0; i < Semantic_Labels.length; i++) {
        if (that.id.substring(0, that.id.length - 3) == Semantic_Labels[i]["label"]) {
            updateindex = i
            break
        }
    }
    $(obj.parentNode).append(`<input type="text" class="rename"> <button class="upd-btn" onclick="update(this)">Change</button>`)
}

function update(obj) {
    var rename = $(obj.parentNode).find(".rename").val();
    obj.parentNode.querySelector(".opt").nextSibling.nodeValue = rename;
    obj.parentNode.querySelector(".rename").remove();
    obj.parentNode.querySelector(".upd-btn").remove();
    original_name = Semantic_Labels[updateindex]["label"]
    saveX = Semantic_Labels[updateindex]["X"]
    saveY = Semantic_Labels[updateindex]["Y"]
    Semantic_Labels.splice(updateindex, 1)
    document.getElementById(original_name).parentNode.remove()
    insertOrUpdate(Semantic_Labels, "label", rename, ["X", "Y"], [saveX, saveY])
    auto_draw(0)
    zoom = 0
}

var topFrame
var leftFrame
function getScollPostion() {
    topFrame = document.getElementById("ImgWrap").scrollTop
    leftFrame = document.getElementById("ImgWrap").scrollLeft
}
function setScollPostion() {
    document.getElementById("ImgWrap").scrollTop = topFrame
    document.getElementById("ImgWrap").scrollLeft = leftFrame
}

function get_angleinfor() {
    $.ajax({
        type: 'GET',
        url: window.angleinfor_url,
        data: {
            "file_dir": file_dir,
            "subject": subjects_list[index],
        },
        dataType: 'JSON',
        async: false,
        traditional: true,
        success: function (resdata) {
            var pangle = document.getElementById("p_angle")
            pangle.innerText = resdata["angleinfor"].substr(1,resdata["angleinfor"].length-2)
        }
    })
}
$(".downloadBtn").on('click', function () {
        window.location.href = download_url
    }
)