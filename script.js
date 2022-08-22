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
    answer = answer.toLowerCase().replace(/\?/g,'').replace(/,/g,'');
    correct_answer = correct_answer.toLowerCase().replace(/\?/g,'').replace(/,/g,'');
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
    show_progress();
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

function show_progress() {
    var progress = get_progress();
    $('#progressbar').val(progress);
    $('#progressbar').text(progress + '%');
}

function get_progress() {
    var keys = Object.keys(pool);
    var total = keys.length;
    var correctly_answered = 0;
    for (key in pool) {
        if (key in prev_answers && prev_answers[key][0]) {
            correctly_answered += 1;
        }
    }
    return 100 * correctly_answered / total;
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

function prepend_and_cap(value, array) {
    var newArray = array.slice();
    newArray.unshift(value);
    return newArray.slice(0, 10);
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
        'university teacher': 'dėstytojas/dėstytoja',
        'student': 'studentas/studentė',
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
        'ireland': 'airija',
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
    'sekmes-3-numbers': {
        '0': 'nulis',
        '1': 'vienas',
        '2': 'du',
        '3': 'trys',
        '4': 'keturi',
        '5': 'penki',
        '6': 'šeši',
        '7': 'septyni',
        '8': 'aštuoni',
        '9': 'devyni',
        '10': 'dešimt',
        '11': 'vienuolika',
        '12': 'dvylika',
        '13': 'trylika',
        '14': 'keturiolika',
        '15': 'penkiolika',
        '16': 'šešiolika',
        '17': 'septyniolika',
        '18': 'aštuoniolika',
        '19': 'devyniolika',
        '20': 'dvidešimt',
        '30': 'trisdešimt',
        '40': 'keturiasdešimt',
        '50': 'penkiasdešimt',
        '60': 'šešiasdešimt',
        '70': 'septyniasdešimt',
        '80': 'aštuoniasdešimt',
        '90': 'devyniasdešimt',
        '100': 'šimtas',
        '200': 'du šimtai',
        '45': 'keturiasdešimt penki',
        '116': 'šimtas šešiolika',
        '205': 'du šimtai penki'
    },
    'sekmes-3-basic': {
        'to live': 'gyventi',
        'she lives': 'ji gyvena',
        'to live (past form)': 'gyveno',
        'to work': 'dirbti',
        'he works': 'jis dirba',
        'to work (past form)': 'dirbo',
        'to study': 'studijuoti',
        'they study': 'jie studijuoja/jos studijuoja',
        'to study (past form)': 'studijavo',
        'colleague': 'bendradarbis/bendradarbė',
        'neighbour': 'kaimynas/kaimynė',
        'capital': 'sostinė',
        'city': 'miestas',
        'centre': 'centras',
        'old town': 'senamiestis',
        'address': 'adresas',
        'telephone number': 'telefono numeris',
        'house': 'namas',
        'apartment': 'butas',
        'room': 'kambarys',
        'dormitory': 'bendrabutis',
        'hotel': 'viešbutis',
        'church': 'bažnyčia',
        'embassy': 'ambasada',
        'bank': 'bankas',
        'post office': 'paštas',
        'ministry': 'ministerija',
        'office (bureau)': 'biuras',
        'university': 'universitetas',
        'school': 'mokykla',
        'nursery school': 'vaikų darželis',
        'library': 'biblioteka',
        'bookstore': 'knygynas',
        'restaurant': 'restoranas',
        'bar': 'baras',
        'cafe': 'kavinė',
        'canteen': 'valgykla',
        'shopping centre': 'prekybos centras',
        'shop': 'parduotuvė',
        'kiosk': 'kioskas',
        'market': 'turgus',
        'hairdresser’s': 'kirpykla',
        'beauty salon': 'grožio salonas',
        'cinema': 'kino teatras',
        'theatre': 'teatras',
        'museum': 'muziejus',
        'castle': 'pilis',
        'gym': 'sporto klubas',
        'hospital': 'ligoninė',
        'clinic': 'klinika',
        'pharmacy': 'vaistinė',
        'street': 'gatvė',
        'alley': 'alėja',
        'avenue': 'prospektas',
        'square': 'aikštė',
        'airport': 'oro uostas',
        'station': 'stotis',
        'bus station': 'autobusų stotis',
        'railway station': 'geležinkelio stotis',
        'bus (trolleybus, tram) stop': 'stotelė',
        'work': 'darbas',
        'river': 'upė',
        'bridge': 'tiltas',
        'lake': 'ežeras',
        'sea': 'jūra',
        'park': 'parkas',
        'forest': 'miškas',
        'near': 'arti',
        'far': 'toli',
        'at home': 'namie',
    },
    'sekmes-3-advanced': {
        'where do you live?': 'Kur tu gyveni?/Kur jūs gyvenate?',
        'We live in centre': 'Mes gyvename centre',
        'She live in old town': 'Ji gyvena senamiestyje',
        'He lives in Panevėžys': 'Jis gyvena Panevėžyje',
        'Do you work in Lithuania?': 'Ar tu dirbi Lietuvoje?/Ar jūs dirbate Lietuvoje?',
        'We are in cafe now': 'Mes dabar esame kavinėje',
        'I live in Vilnius': 'Aš gyvenu Vilniuje',
        'I\'m home': 'Aš esu namie',
        'I work in Trakai': 'Aš dirbu Trakuose',
        'I live in Santariškės': 'Aš gyvenu Santariškėse',
        '(I live) near bank': 'prie banko',
        '(I live) near hotel': 'prie viešbučio',
        '(I live) near Panevėžys': 'prie Panevėžio',
        '(I live) near embassy': 'prie ambasados',
        '(I live) near cafe': 'prie kavinės',
        '(I live) near market': 'prie turgaus',
        '(I live) near castle': 'prie pilies',
        'What is your address?': 'Koks tavo adresas?/Koks jūsų adresas?',
        'What is your telephone number?': 'Koks tavo telefono numeris?/Koks jūsų telefono numeris?',
        'Please, repeat': 'Prašom pakartoti',
        'Where is museum?': 'Kur yra muziejus?',
        'Museum is near park': 'Muziejus yra prie parko',
        'Is station far away?': 'Ar stotis yra toli?'
    }

}