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

var prev_answers = {}   // 'імя': [true, 2] - means імя was correctly answered 2 turns ago
function submit_answer(answer) {
    var question = $('#question').text();
    var correct_answer = pool[question];
    var strict_match = $('#strict-match').is(':checked');
    answer = answer.toLowerCase().replace('?','').replace(',','');
    correct_answer = correct_answer.toLowerCase().replace('?','').replace(',','');
    if (!strict_match) {
        answer = remove_diacritics(answer);
        correct_answer = remove_diacritics(correct_answer);
    }
    for (var key in prev_answers) {
        var old = prev_answers[key]
        prev_answers[key] = [old[0], old[1] + 1];
    }
    var correct = false;
    correct_answer.split('/').forEach(function (variant) {
        if (answer == variant) {
            correct = true;
        }
    });
    if (correct) {
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

var dicts = {
    'sekmes-1-basic': {
        'to be': 'būti',
        'to be (past form)': 'buvo',
        'i am': 'aš esu',
        'she is': 'ji yra',
        'we are': 'mes esame',
        'they are': 'jie yra/jos yra',
        'he\'s not': 'jis nėra',
        'you (plural) are not': 'jūs nesate',
        'not to be (past form)': 'nebuvo',
        'not to be': 'nebūti',
        'yes': 'taip',
        'no': 'ne',
        'here': 'čia',
        'and': 'ir',
        'university teacher (man)': 'dėstytojas',
        'university teacher (woman)': 'dėstytoja',
        'student (man)': 'studentas',
        'student (woman)': 'studentė',
        'name': 'vardas',
        'surname': 'pavardė',
        'never mind (it\'s ok)': 'nieko tokio',
        'i am sorry': 'atsiprašau',
        'goodbye': 'viso gero/sudie/iki/iki pasimatymo',
        'please': 'prašom',
        'thanks': 'ačiū',
    },
    'sekmes-1-advanced': {
        'my name is': 'mano vardas/mano vardas yra',
        'my surname is': 'mano pavardė/mano pavardė yra',
        'what is your name?': 'koks jūsų vardas?',
        'what is your surname?': 'kokia jūsų pavardė?',
        'good morning': 'labas rytas',
        'good day': 'laba diena',
        'good evening': 'labas vakaras',
        '(mano vardas ... ) and yours?': 'o jūsų?',
        'nice (to meet you)': 'malonu',
        'nice (to meet you) too': 'man taip pat malonu',
        'not at all (you are welcome)': 'nėra už ką',
        'he is belarusian': 'jis yra baltarusis',
        'she is polish': 'ji yra lenkė',
        'are you german?': 'ar jūs esate vokietis?',
        'he is not chinese': 'jis nėra kinas',
        'i am not american': 'aš nesu amerikietis/aš nesu amerikietė',
        'finland': 'suomija',
        'france': 'prancūzija',
        'russia': 'rusija',
        'who is she?': 'kas ji yra?',
        'who are you?': 'kas jūs esate?'
    },
    'sekmes-2-basic': {
        'to speak': 'kalbėti',
        'to speak (past form)': 'kalbėjo',
        'to understand': 'suprasti',
        'to understand (past form)': 'suprato',
        'but': 'bet',
        'bad': 'blogai',
        'good, fine': 'gerai',
        'so-so': 'šiaip sau',
        'as well, too': 'taip pat',
        'a little (bit)': 'truputį',
        'Mr': 'ponas',
        'Mrs': 'ponia',
        'friend': 'draugas/draugė',
        'i don\'t speak': 'aš nekalbu',
        'she speaks': 'ji kalba',
        'we understand': 'mes suprantame',
        'you (plural) speak': 'jūs kalbate',
        'you (singular) understand': 'tu supranti',
        'they understand': 'jie supranta/jos supranta'
    },
    'sekmes-2-advanced': {
        'how are you?': 'kaip sekasi?',
        'where are you (plural) from?': 'Iš kur jūs esate?',
        'where are you (singular) from?': 'Iš kur tu esi?',
        'I am from Belarus': 'Aš esu iš Baltarusijos',
        'He is from Minsk': 'Jis yra iš Minsko',
        'We are from Panevėžys': 'Mes esame iš Panevėžio',
        'I am not from Israel': 'Aš nesu iš Izraelio',
        'She is not from Vilnius': 'Ji nėra iš Vilniaus',
        'They are from Marijampolė': 'Jie yra iš Marijampolės',
        'Good day, Mr Tomas': 'Laba diena, pone Tomai',
        'Good evening, Paulius': 'Labas vakaras, Pauliau',
        'I speak lithuanian and english': 'Aš kalbu lietuviškai ir angliškai',
        'we understand french': 'Mes suprantame prancūziškai',
        'How do you speak? (language)': 'Kaip jūs kalbate?',
        '(How are you? -Ačiū, gerai) and you ?': 'O jums?',
        'This is my friend': 'čia mano draugas/čia yra mano draugas'
    },
}