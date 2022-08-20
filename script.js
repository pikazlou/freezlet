$(document).ready(function(){
    $('.diacritic').click(function() {
        var character = $(this).text();
        var current_input = $('#answer').val() || '';
        $('#answer').val(current_input + character);
        $('#answer').focus();
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
    if (answer == correct_answer) {
        $('#outcome').html($('#outcome_correct').html() + '<b>' + pool[question] + '</b>');
        show_next_word();
    } else {
        $('#outcome').html($('#outcome_incorrect').html() + '<b>' + pool[question] + '</b>');
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
  var keys = Object.keys(pool);
  return keys[Math.floor(keys.length * Math.random())];
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
