index_id = 0
subject_id = 0
subject_num = imgs_num.length
length = files[subject_id]
selected_list = []
selected_subjects_list = []
selected_indexes_list = []


length = imgs_num[subject_id]
var imgurl = file_dir + "/" + files[subject_id] + "/images/" + (index_id + 1) + ".png"
$(".frame-middle p").html(`<span>${files[subject_id]}</span>（<span id="index">${index_id + 1}</span>/<span>${length}</span>）`)
document.getElementById("display").src = imgurl;
get_angleinfor()


$(".nextimgBtn").on('click', function () {
    if (index_id < length - 1) {
        index_id = index_id + 1
        $("#index").text(index_id + 1)
        var imgurl = file_dir + "/" + files[subject_id] + "/images/" + (index_id + 1) + ".png"
        document.getElementById("display").src = imgurl;
        // get_angleinfor()
        $(".frame-middle p").html(`<span>${files[subject_id]}</span>（<span id="index">${index_id + 1}</span>/<span>${length}</span>）`)
    }
})

$("#display").on('load', function () {
    var obj = $(this)
    if (obj.width() < $(".frame-middle").width()) {
        $("#display").css('left', `calc(50% - ${$("#display").width() / 2 + 'px'})`)
    } else {
        $("#display").css('left', '')
    }
    if (obj.height() < $(".frame-middle").height()) {
        $("#display").css('top', `calc(50% - ${$("#display").height() / 2 + 'px'})`)
    } else {
        $("#display").css('top', '')
    }
})

$(".previmgBtn").on('click', function () {
    if (index_id > 0) {
        index_id = index_id - 1
        $("#index").text(index_id + 1)
        var imgurl = file_dir + "/" + files[subject_id] + "/images/" + (index_id + 1) + ".png"
        document.getElementById("display").src = imgurl;
        // get_angleinfor()
        $(".frame-middle p").html(`<span>${files[subject_id]}</span>（<span id="index">${index_id + 1}</span>/<span>${length}</span>）`)
    }
})
$(".prefolderBtn").on('click', function () {
    if (subject_id > 0) {
        subject_id = subject_id - 1
        index_id = 0
        length = imgs_num[subject_id]
        var imgurl = file_dir + "/" + files[subject_id] + "/images/" + (index_id + 1) + ".png"
        document.getElementById("display").src = imgurl;
        get_angleinfor()
        $(".frame-middle p").html(`<span>${files[subject_id]}</span>（<span id="index">${index_id + 1}</span>/<span>${length}</span>）`)
    }
})
$(".nextfolderBtn").on('click', function () {
    if (subject_id < subject_num - 1) {
        subject_id = subject_id + 1
        index_id = 0
        length = imgs_num[subject_id]
        var imgurl = file_dir + "/" + files[subject_id] + "/images/" + (index_id + 1) + ".png"
        document.getElementById("display").src = imgurl;
        get_angleinfor()
        $(".frame-middle p").html(`<span>${files[subject_id]}</span>（<span id="index">${index_id + 1}</span>/<span>${length}</span>）`)
    }
})
$(".selectBtn").on('click', function () {
        if (selected_subjects_list.indexOf(files[subject_id]) == -1) {
            $("#fileList").empty()
            selected_subjects_list.push(files[subject_id])
            selected_indexes_list.push(index_id+1)
            for (var i = 0, j = selected_indexes_list.length; i < j; i++) {

                $("#fileList").append(`<li><input type="checkbox" />${selected_subjects_list[i] + "  " + (selected_indexes_list[i])}</li>`)
            }
            if (subject_id < subject_num - 1) {
                subject_id = subject_id + 1
                index_id = 0
                length = imgs_num[subject_id]
                var imgurl = file_dir + "/" + files[subject_id] + "/images/" + (index_id + 1) + ".png"
                document.getElementById("display").src = imgurl;
                get_angleinfor()
                $(".frame-middle p").html(`<span>${files[subject_id]}</span>（<span id="index">${index_id + 1}</span>/<span>${length}</span>）`)
            }
        } else {
            exist_index = selected_subjects_list.indexOf(files[subject_id])
            $("#fileList").empty()
            selected_indexes_list[exist_index] = index_id+1
            for (var i = 0, j = selected_indexes_list.length; i < j; i++) {
                $("#fileList").append(`<li><input type="checkbox" />${selected_subjects_list[i] + "  " + (selected_indexes_list[i] )}</li>`)
            }
            if (subject_id < subject_num - 1) {
                subject_id = subject_id + 1
                index_id = 0
                length = imgs_num[subject_id]
                var imgurl = file_dir + "/" + files[subject_id] + "/images/" + (index_id + 1) + ".png"
                document.getElementById("display").src = imgurl;
                get_angleinfor()
                $(".frame-middle p").html(`<span>${files[subject_id]}</span>（<span id="index">${index_id + 1}</span>/<span>${length}</span>）`)
            }
        }
        console.log(selected_indexes_list)
    }
)
$(".predictBtn").on('click', function () {
        $('#myModal').modal({
            backdrop: "static"
        })
        setInterval(function(){
            $.ajax({
            type: 'GET',
            url: window.process_url,
            data: {
            },
            dataType: 'JSON',
            traditional: true,
            success: function (res) {
                console.log(res)
                $('#prog_in').width(res + '%');
            }
        })
        }, 1000);

        $.ajax({
            type: 'POST',
            url: window.predict_url,
            data: {
                "selected_subjects": selected_subjects_list,
                "selected_indexes": selected_indexes_list,
                "img_dir": file_dir
            },
            dataType: 'JSON',
            traditional: true,
            success: function () {
                window.location.href = modify_url
            }
        })
    }
)



$(".paintBtn").on('click', function () {
        var flag = 0;
        var canvas = document.getElementById("canvas")
        var ctx = canvas.getContext("2d")
        canvas.onmousedown = function (evt) {
            evt = window.event || evt;
            var startX = evt.pageX - this.offsetLeft;
            var startY = evt.pageY - this.offsetTop;


            ctx.beginPath();
            ctx.moveTo(startX, startY);
            flag = 1;

        }

        canvas.onmousemove = function (evt) {
            evt = window.event || evt;

            var endX = evt.pageX - this.offsetLeft;
            var endY = evt.pageY - this.offsetTop;
            if (flag) {
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 5;

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

function get_angleinfor() {
    $.ajax({
        type: 'GET',
        url: window.angleinfor_url,
        data: {
            "file_dir": file_dir,
            "subject": files[subject_id],
        },
        dataType: 'JSON',
        async: false,
        traditional: true,
        success: function (resdata) {
            console.log(resdata)
            var pangle = document.getElementById("p_angle")
            pangle.innerText = resdata["angleinfor"].substr(1,resdata["angleinfor"].length-2)
        }
    })
}