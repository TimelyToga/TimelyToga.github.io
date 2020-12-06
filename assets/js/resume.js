/**
 * Created by Tim on 04/12/16.
 */
$(window).load(function () {
    var line = $('#timeline_line');

    // Open + close the resume item tiles when you click on the title
    $('.timeline-title').click(function (e) {
        console.log(e);
        var p = jQuery(this).siblings('.timeline_entry_description');
        var thisthis = this;

        p.slideToggle(function () {
            // Increase line height
            var newHeight = 0;
            if (p.css("display") == "none") {
                newHeight = line.outerHeight() - $('.timeline_entry_description', thisthis).outerHeight();
            } else {
                newHeight = line.outerHeight() + $('.timeline_entry_description', thisthis).outerHeight();
            }

            line.animate({ height: newHeight }, function () {
            });
        })
    });
});
