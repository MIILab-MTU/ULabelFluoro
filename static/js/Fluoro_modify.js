index = 0
subject_num = subjects_list.length
length = subject_num

var zoom = 0
var pointsDataX = []
var pointsDataY = []
var canvas = document.getElementById("canvas")
var ctx = canvas.getContext("2d")
var c1
var E_P_thinkness

auto_draw(0)

$(".refreshBtn").on('click', function () {
    auto_draw(1)
    modifyid = 5
})

$(".nextimgBtn").on('click', function () {
    if (index < length - 1) {
        index = index + 1
        auto_draw(0)
        modifyid = 5
    }
})

$(".previmgBtn").on('click', function () {
    if (index > 0) {
        index = index - 1
        auto_draw(0)
        modifyid = 5
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

var modifyid = 5
$(".paintBtn").on('click', function () {
        set_thinkness(zoom)
        modifyid = 0
        resetzoom(zoom)
        var flag = 0;
        var canvas = document.getElementById("canvas")
        var ctx = canvas.getContext("2d")
        canvas.onmousedown = function (evt) {
            c1 = ctx.getImageData(0, 0, canvas.width, canvas.height)
            var evt = window.event || evt;
            startX = evt.offsetX;
            startY = evt.offsetY;
            startX = transpoint(zoom, startX)
            startY = transpoint(zoom, startY)
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            flag = 1;
        }

        canvas.onmousemove = function (evt) {
            var evt = window.event || evt;
            var endX = evt.offsetX;
            var endY = evt.offsetY;
            if (flag) {
                endX = transpoint(zoom, endX)
                endY = transpoint(zoom, endY)
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = 'red';
                ctx.lineWidth = E_P_thinkness;
                ctx.stroke();
            }
        }
        canvas.onmouseup = function () {
            flag = 0;
        }
        canvas.onmouseleave = function () {
            flag = 0;
        }
    }
)

var eraserFlag = 0; //设置橡皮擦的状态标志位
$(".eraserBtn").on('click', function () {
        set_thinkness(zoom)
        modifyid = 4
        resetzoom(zoom)
        var canvas = document.getElementById("canvas")
        var ctx = canvas.getContext("2d")
        canvas.onmousedown = function (evt) {
            c1 = ctx.getImageData(0, 0, canvas.width, canvas.height)
            var evt = window.event || evt;
            eraserX = evt.offsetX;
            eraserY = evt.offsetY;
            eraserX = transpoint(zoom, eraserX)
            eraserY = transpoint(zoom, eraserY)
            ctx.clearRect(eraserX, eraserY, E_P_thinkness, E_P_thinkness)
            eraserFlag = 1;

        }
        canvas.onmousemove = function (evt) {
            var evt = window.event || evt;
            eraserX = evt.offsetX;
            eraserY = evt.offsetY;
            eraserX = transpoint(zoom, eraserX)
            eraserY = transpoint(zoom, eraserY)
            if (eraserFlag) {
                ctx.clearRect(eraserX, eraserY, E_P_thinkness, E_P_thinkness)
            }
        }

        canvas.onmouseup = function () {
            eraserFlag = 0;
        }
        canvas.onmouseleave = function () {
            eraserFlag = 0;
        }
    }
)

var fillArea_x = []
var fillArea_y = []
$(".fillAreaBtn").on('click', function () {
    Get_pixels_index()
    modifyid = 1
    resetzoom(zoom)
    var canvas = document.getElementById("canvas")
    var ctx = canvas.getContext("2d")

    var flag = false
    var oldx = -10
    var oldy = -10
    var linecolor = "red"
    ctx.fillStyle = 'red'
    var linw = 2
    var newx = -10
    var newy = -10


    canvas.onmousedown = function (evt) {
        var evt = window.event || evt;
        newx = evt.offsetX;
        newy = evt.offsetY;
        newx = transpoint(zoom, newx)
        newy = transpoint(zoom, newy)
        fillArea_x.push(newx)
        fillArea_y.push(newy)
        console.log(fillArea_x)
        ctx.fillRect(newx, newy, 1, 1)
        ctx.fillStyle = 'red'
    }
    canvas.onmouseup = function () {
        if (fillArea_x.length == 1) {
            first_x = newx
            first_y = newy
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
                ctx.closePath()
                ctx.fill()
                fillArea_x = []
                fillArea_y = []
                flag = false
            }
        }
    }

})

$(".clearAreaBtn").on('click', function () {

    Get_pixels_index()
    modifyid = 2
    resetzoom(zoom)
    var canvas = document.getElementById("canvas")
    var ctx = canvas.getContext("2d")
    var flag = false
    var oldx = -10
    var oldy = -10
    var linecolor = "yellow"
    var linw = 2
    var newx = -10
    var newy = -10
    ctx.fillStyle = 'yellow'
    canvas.onmousedown = function (evt) {
        ctx.globalCompositeOperation = "source-over"
        var evt = window.event || evt;
        newx = evt.offsetX;
        newy = evt.offsetY;
        newx = transpoint(zoom, newx)
        newy = transpoint(zoom, newy)
        fillArea_x.push(newx)
        fillArea_y.push(newy)
        ctx.fillRect(newx, newy, 1, 1)
        ctx.fillStyle = 'yellow'
    }

    canvas.onmouseup = function () {
        if (fillArea_x.length == 1) {
            first_x = newx
            first_y = newy
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
                ctx.globalCompositeOperation = "source-over"
                ctx.closePath()
                ctx.fillStyle = 'yellow'
                ctx.fill()
                fillArea_x = []
                fillArea_y = []
                // 画布上所有的点
                color_xy = Get_pixels_index_with_color([255, 255, 0, 255])
                clear_x = color_xy[0]
                clear_y = color_xy[1]
                //先清除画布
                ctx.clearRect(0, 0, canvas.width, canvas.height)

                ctx.fillStyle = "#ff0000";
                for (var i = 0; i < pointsDataX.length; i++) {
                    ctx.fillRect(pointsDataX[i], pointsDataY[i], 1, 1);
                }
                for (var i = 0; i < clear_x.length; i++) {
                    ctx.clearRect(clear_x[i], clear_y[i], 1, 1);
                }
                ctx.fillStyle = "#ffff00";
                flag = false
            }
        }
    }
})
$(".saveBtn").on('click', function () {
        auto_draw(1)
        var ImageData_URI = canvas.toDataURL("image/png")
        console.log(ImageData_URI)
        $.ajax({
            type: 'POST',
            url: window.post_modify_label_url,
            data: {
                "file_dir": file_dir,
                "subject": subjects_list[index],
                "index": indexes_list[index],
                "label": ImageData_URI,
                // "label_x": pointsDataX,
                // "label_y": pointsDataY,
                "img_x": document.getElementById("canvas").width,
                "img_y": document.getElementById("canvas").height,
            },
            dataType: 'JSON',
            async: false,
            traditional: true,
            success: function (resdata) {
                if (index < length - 1) {
                    index = index + 1
                    auto_draw(0)
                    last_id = subjects_list[index]
                }
            }
        })
    }
)
// $(".saveBtn").on('click', function () {
//         auto_draw(1)
//         $.ajax({
//             type: 'POST',
//             url: window.post_modify_label_url,
//             data: {
//                 "file_dir": file_dir,
//                 "subject": subjects_list[index],
//                 "index": indexes_list[index],
//                 "label_x": pointsDataX,
//                 "label_y": pointsDataY,
//                 "img_x": document.getElementById("canvas").width,
//                 "img_y": document.getElementById("canvas").height,
//             },
//             dataType: 'JSON',
//             async: false,
//             traditional: true,
//             success: function (resdata) {
//                 if (index < length - 1) {
//                     index = index + 1
//                     auto_draw(0)
//                     last_id = subjects_list[index]
//                 }
//             }
//         })
//     }
// )

$(".semanticBtn").on('click', function () {
        window.location.href = window.semantic_label_url
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

function Get_pixels_index() {
    pointsDataX = []
    pointsDataY = []
    var oImg = ctx.getImageData(0, 0, document.getElementById("canvas").width, document.getElementById("canvas").height);
    for (i = 0; i < document.getElementById("canvas").width; i++) {
        for (j = 0; j < document.getElementById("canvas").height; j++) {
            if (list_the_same(getXY(oImg, i, j), [255, 0, 0, 255])) {
                pointsDataX.push(i)
                pointsDataY.push(j)
            }
        }
    }
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
    set_thinkness(zoom)
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
    set_thinkness(zoom)

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
    console.log(file_dir, subjects_list, indexes_list)
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
                pointsDataX = resdata.pointsY
                pointsDataY = resdata.pointsX
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
                $(".frame-middle p").html(`<span>${subjects_list[index]}</span> （<span id="index">${indexes_list[index]}</span>）`)
                document.getElementById("display").src = imgurl
                get_angleinfor()
                ctx.fillStyle = "#ff0000";
                for (var i = 0; i < resdata.pointsX.length; i++) {
                    ctx.fillRect(resdata.pointsY[i], resdata.pointsX[i], 1, 1);
                }
                zoom = 0
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
                Get_pixels_index()
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

function resetzoom(zoomid) {
    getScollPostion()
    if (zoomid > 0) {
        auto_draw(1)
        for (var i = 0; i < zoom; i++) {
            zoomIn()
        }
    } else {
        auto_draw(1)
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

$(".undoBtn").on('click', function () {
    if (modifyid == 0 || modifyid == 4) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.putImageData(c1, 0, 0)
    } else {
        ctx.clearRect(0, 0, 512, 512)
        ctx.fillStyle = "#FF0000"
        for (var i = 0; i < pointsDataX.length; i++) {
            ctx.fillRect(pointsDataX[i], pointsDataY[i], 1, 1);
        }
        if (modifyid == 1) {
            ctx.fillStyle = "#FF0000"
        } else {
            ctx.fillStyle = "#FFFF00"
        }
        fillArea_x.pop()
        fillArea_y.pop()
        console.log(fillArea_x)
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
})


//禁用
$.fn.disable = function () {
    $(this).addClass("disable");
};

//启用
$.fn.enable = function () {
    $(this).removeClass("disable");
};

$(document).keydown(function (event) {
    if (event.keyCode == 68) { //d
        zoomIn()
        zoom = zoom + 1
        resetlocation()
    }
    if (event.keyCode == 65) { //a

        zoomOut()
        zoom = zoom - 1
        resetlocation()
    }
    if (event.keyCode == 83) { //s
        if (modifyid == 0 || modifyid == 4) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.putImageData(c1, 0, 0)
        } else {
            ctx.clearRect(0, 0, 512, 512)
            ctx.fillStyle = "#FF0000"
            for (var i = 0; i < pointsDataX.length; i++) {
                ctx.fillRect(pointsDataX[i], pointsDataY[i], 1, 1);
            }
            if (modifyid == 1) {
                ctx.fillStyle = "#FF0000"
            } else {
                ctx.fillStyle = "#FFFF00"
            }
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
    }
    if (event.keyCode == 87) { //w
        if (document.getElementById(subjects_list[index]).checked == true) {
            document.getElementById(subjects_list[index]).checked = false
            // Get_pixels_index()
            c1 = ctx.getImageData(0, 0, canvas.width, canvas.height)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            $("#canvas").disable()

        } else {
            document.getElementById(subjects_list[index]).checked = true
            ctx.fillStyle = "#ff0000";
            ctx.putImageData(c1, 0, 0)
            $("#canvas").enable()
            // document.getElementById("canvas").disabled = false
            //     for (var i = 0; i < pointsDataX.length; i++) {
            //         ctx.fillRect(pointsDataX[i], pointsDataY[i], 1, 1);
            //     }
        }
    }
    if (event.keyCode == 69) { //e
        document.getElementById("myInput").value = parseInt(document.getElementById("myInput").value) + 1
        E_P_thinkness = document.getElementById("myInput").value
    }
    if (event.keyCode == 81) { //q
        document.getElementById("myInput").value = parseInt(document.getElementById("myInput").value) - 1
        E_P_thinkness = document.getElementById("myInput").value
    }
    // window.onmousewheel = document.onmousewheel = (e) => {
    //     if (e.wheelDelta < 0) {
    //         console.log("鼠标滚轮后滚")
    //     } else if (e.wheelDelta > 0) {
    //         console.log("鼠标滚轮前滚")
    //     }
    //
    // }
})

$(".label-item-range,.Q,.E,.img-wrap").on("wheel mousewheel DOMMouseScroll", function (e) {
    var delta = (e.originalEvent.wheelDelta && (e.originalEvent.wheelDelta > 0 ? 1 : -1)) ||  // chrome & ie
        (e.originalEvent.detail && (e.originalEvent.detail > 0 ? -1 : 1));              // firefox
    // 存放应该设置的元素的top值
    if (delta > 0) {
        // 向上滚
        console.log("up")
        document.getElementById("myInput").value = parseInt(document.getElementById("myInput").value) + 1
        E_P_thinkness = document.getElementById("myInput").value
    } else if (delta < 0) {
        // 向下滚
        console.log("down")
        document.getElementById("myInput").value = parseInt(document.getElementById("myInput").value) - 1
        E_P_thinkness = document.getElementById("myInput").value
    }
    if (e.preventDefault) {/*FF 和 Chrome*/
        e.preventDefault();// 阻止默认事件
    }
})


function myFunction() {
    E_P_thinkness = document.getElementById("myInput").value;
}

function set_thinkness(zoomid) {
    if (zoomid <= -5) {
        document.getElementById("myInput").value = 15
        E_P_thinkness = 15
    }
    if (zoomid > -5 && zoomid <= -1) {
        document.getElementById("myInput").value = 10
        E_P_thinkness = 10
    }
    if (zoomid > -1 && zoomid <= 2) {
        document.getElementById("myInput").value = 7
        E_P_thinkness = 7
    }
    if (zoomid > 2 && zoomid <= 4) {
        document.getElementById("myInput").value =
            E_P_thinkness = 4
    }
    if (zoomid > 4 && zoomid <= 5) {
        document.getElementById("myInput").value =
            E_P_thinkness = 4
    }
    if (zoomid > 5 && zoomid <= 6) {
        document.getElementById("myInput").value =
            E_P_thinkness = 2
    }
    if (zoomid > 6) {
        document.getElementById("myInput").value =
            E_P_thinkness = 1
    }

}

var last_id

function testClick(obj) {
    var that = obj;
    if (that.checked == false) {
        // Get_pixels_index()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        last_id = that.id
    } else {
        for (var i = 0; i < length; i++) {
            if (that.id == subjects_list[i]) {
                index = i
                break
            }
        }
        if (that.id == last_id) {
            ctx.fillStyle = "#ff0000";
            for (var i = 0; i < pointsDataX.length; i++) {
                ctx.fillRect(pointsDataX[i], pointsDataY[i], 1, 1);
            }
        } else {
            last_id = that.id
            auto_draw(0)
        }
    }
}

function Get_pixels_index_with_color(color) {
    Get_pixels_index()
    All = []
    DataX = []
    DataY = []
    var oImg = ctx.getImageData(0, 0, document.getElementById("canvas").width, document.getElementById("canvas").height);
    for (var i = 0; i < pointsDataX.length; i++) {
        if (list_the_same(getXY(oImg, pointsDataX[i], pointsDataY[i]), [255, 255, 0, 255])) {
            DataX.push(pointsDataX[i])
            DataY.push(pointsDataY[i])
        }
    }
    All.push(DataX)
    All.push(DataY)
    return All
}

ImgWrap.onmousemove = function () {
    if (modifyid == 0) {
        this.style.cursor = 'url("../static/icons/pencil.png") 3 3,auto';

    } else if (modifyid == 4) {
        this.style.cursor = 'url("../static/icons/eraser.ico") 0 22,auto';
    } else if (modifyid == 1 || modifyid == 2) {
        this.style.cursor = 'crosshair';
    }

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
            console.log(resdata)
            var pangle = document.getElementById("p_angle")
            pangle.innerText = resdata["angleinfor"].substr(1, resdata["angleinfor"].length - 2)
        }
    })
}
