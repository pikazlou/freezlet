$(document).ready(function(){
    $('.diacritic').click(function() {
        var character = $(this).text();
        var current_input = $('#answer').val() || '';
        var caretPos =  document.getElementById("answer").selectionStart;
        $('#answer').val(current_input.substring(0, caretPos) + character + current_input.substring(caretPos) );
        $('#answer').focus();
        document.getElementById("answer").selectionStart = caretPos + 1;
        document.getElementById("answer").selectionEnd = caretPos + 1;
    });

    $('.dicts:not(:checked)').click(function() {
        show_next_word();
    });

    $('#answer').on('keypress', function (e) {
         if(e.which === 13){
            var answer = $(this).val();
            submit_answer(answer);
         }
   });
   $('#submit').click(function () {
        var answer = $('#answer').val();
        submit_answer(answer);
   });
});

var dicts = {
    'sekmes-1': {
        'быць': 'būti',
        'быў': 'buvo',
        'яна ёсць (быць)': 'ji yra',
        'мы ёсць (быць)': 'mes esame',
        'ён не ёсць (быць)': 'jis nėra',
        'вы не ёсьц (быць)': 'jūs nesate',
        'не быў': 'nebuvo',
        'не быць': 'nebūti',
        'так': 'taip',
        'не': 'ne',
        'тут': 'čia',
        'і': 'ir',
        'а': 'o',
        'выкладчыца': 'dėstytoja',
        'студэнтка': 'studentė',
        'імя': 'vardas',
        'прозвішча': 'pavardė'
    }
}

var prev_answers = {}   // 'імя': [true, 2] - means імя was correctly answered 2 turns ago
function submit_answer(answer) {
    var question = $('#question').text();
    var correct_answer = pool[question];
    var strict_match = $('#strict-match').is(':checked');
    answer = answer.toLowerCase();
    correct_answer = correct_answer.toLowerCase();
    if (!strict_match) {
        answer = remove_diacritics(answer);
        correct_answer = remove_diacritics(correct_answer);
    }
    for (var key in prev_answers) {
        var old = prev_answers[key]
        prev_answers[key] = [old[0], old[1] + 1];
    }
    if (answer == correct_answer) {
        $('#outcome').html($('#outcome_correct').html() + '<b>' + pool[question] + '</b>');
        prev_answers[question] = [true, 1];
        show_next_word();
    } else {
        $('#outcome').html($('#outcome_incorrect').html() + '<b>' + pool[question] + '</b>');
        prev_answers[question] = [false, 1];
        show_next_word();
    }
}

function show_next_word() {
    var word = get_next_word() || '\xa0';
    $('#question').text(word);
    $('#answer').val('');
    $('#answer').focus();
}

var pool = {};
function get_next_word() {
    pool = {}
    $('.dicts:checked').each(function( index ) {
      var enabled_dict = dicts[$(this).attr('id')];
      for (var key in enabled_dict) {
        pool[key] = enabled_dict[key];
      }
    });

    var word_count = Object.keys(pool).length;

    var word_probabilities = {}
    var prob_sum = 0.0;
    for (var key in pool) {
        var prob = 1.0;
        if (key in prev_answers) {
            var pa = prev_answers[key];
            if (pa[0]) {    //it was correct answer
                prob = Math.min(0.1 / word_count * pa[1], 1.0);
            } else {    //it was incorrect answer
                if (pa[1] <= 5) {
                    prob = 0.0;
                } else {
                    prob = 1.0 + pa[1] - 4;
                }
            }
        }
        word_probabilities[key] = prob;
        prob_sum += prob;
    }


    var keys = Object.keys(pool);

    var num = Math.random(),
            s = 0,
            lastIndex = keys.length - 1;

        for (var i = 0; i < lastIndex; ++i) {
            s += word_probabilities[keys[i]] / prob_sum;
            if (num < s) {
                return keys[i];
            }
        }


    return keys[lastIndex];
}

function remove_diacritics(text) {
    var result = text;
    result = result.replace(/ą/g, 'a');
    result = result.replace(/č/g, 'c');
    result = result.replace(/ę/g, 'e');
    result = result.replace(/ė/g, 'e');
    result = result.replace(/į/g, 'i');
    result = result.replace(/š/g, 's');
    result = result.replace(/ų/g, 'u');
    result = result.replace(/ū/g, 'u');
    result = result.replace(/ž/g, 'z');
    return result;
}
