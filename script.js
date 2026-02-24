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

    $('.dicts').click(function() {
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
    var one_off_allowed = $('#one-off-allowed').is(':checked');
    var original_answer = answer;
    
    // Normalize user answer
    answer = answer.toLowerCase().replace(/\?/g,'').replace(/!/g,'').replace(/,/g,'').replace(/\./g,'');
    if (!strict_match) {
        answer = remove_diacritics(answer);
    }
    
    for (var key in prev_answers) {
        var old = prev_answers[key]
        prev_answers[key] = [old[0], old[1] + 1];
    }
    var correct = false;
    
    // Generate all possible answer variations from the markup
    function expandAnswerVariants(template) {
        var variants = [template];
        
        // Process parentheses (option1|option2|option3)
        var parenRegex = /\(([^)]+)\)/;
        while (variants.some(function(v) { return parenRegex.test(v); })) {
            var newVariants = [];
            variants.forEach(function(variant) {
                var match = variant.match(parenRegex);
                if (match) {
                    var options = match[1].split('|');
                    options.forEach(function(option) {
                        newVariants.push(variant.replace(parenRegex, option));
                    });
                } else {
                    newVariants.push(variant);
                }
            });
            variants = newVariants;
        }
        
        // Process square brackets [optional text] or [option1|option2]
        var bracketRegex = /\[([^\]]+)\]/;
        while (variants.some(function(v) { return bracketRegex.test(v); })) {
            var newVariants = [];
            variants.forEach(function(variant) {
                var match = variant.match(bracketRegex);
                if (match) {
                    var content = match[1];
                    // Check if there are options inside brackets
                    if (content.indexOf('|') !== -1) {
                        var options = content.split('|');
                        // Include variant with each option
                        options.forEach(function(option) {
                            newVariants.push(variant.replace(bracketRegex, option));
                        });
                    } else {
                        // Include variant with the optional text
                        newVariants.push(variant.replace(bracketRegex, content));
                    }
                    // Always include variant without the optional text
                    newVariants.push(variant.replace(bracketRegex, ''));
                } else {
                    newVariants.push(variant);
                }
            });
            variants = newVariants;
        }
        
        // Clean up multiple spaces and normalize each variant
        return variants.map(function(v) {
            v = v.replace(/\s+/g, ' ').trim();
            v = v.toLowerCase().replace(/\?/g,'').replace(/!/g,'').replace(/,/g,'').replace(/\./g,'');
            if (!strict_match) {
                v = remove_diacritics(v);
            }
            return v;
        });
    }
    
    correct_answer.split('/').forEach(function (answerTemplate) {
        var variants = expandAnswerVariants(answerTemplate);
        variants.forEach(function(variant) {
            var l1 = new Levenshtein(answer, variant);
            if ( (one_off_allowed && l1.distance <= 1) || l1.distance <= 0 ) {
                correct = true;
            }
        });
    });
    if (correct) {
        $('#outcome').html($('#outcome_correct').html().replace('{correct}', pool[question]));
        prev_answers[question] = [true, 1];
        show_next_word();
    } else {
        $('#outcome').html($('#outcome_incorrect').html().replace('{input}', original_answer).replace('{correct}', pool[question]));
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
    if (word == '\xa0') {
        $('#select_vocabulary').show();
        $('#translate').hide();
    } else {
        $('#select_vocabulary').hide();
        $('#translate').show();
    }
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
    return 100 * correctly_answered / Math.max(1, total);
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
        'I am': 'aš esu',
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
        'I am sorry': 'atsiprašau',
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
        'I am not american': 'aš nesu amerikietis/aš nesu amerikietė',
        'Finland': 'suomija',
        'France': 'prancūzija',
        'Russia': 'rusija',
        'Ireland': 'airija',
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
        'I don\'t speak': 'aš nekalbu',
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
    },
    'sekmes-4-basic': {
        'week': 'savaitė',
        'Monday': 'pirmadienis',
        'Tuesday': 'antradienis',
        'Wednesday': 'trečiadienis',
        'Thursday': 'ketvirtadienis',
        'Friday': 'penktadienis',
        'Saturday': 'šeštadienis',
        'Sunday': 'sekmadienis',
        'weekend': 'savaitgalis',
        'hour': 'valanda',
        'half': 'pusė',
        'to go (on foot)': 'eiti',
        'he goes (on foot)': 'jis eina',
        'to go (on foot, past form)': 'ėjo',
        'to rush (to hurry)': 'skubėti',
        'she rushes (hurries)': 'ji skuba',
        'to rush (to hurry, past form)': 'skubėjo',
        'to meet': 'susitikti',
        'we meet': 'mes susitinkame',
        'to meet (past form)': 'susitiko',
        'to go (by transport)': 'važiuoti',
        'he goes (by transport)': 'jis važiuoja',
        'to go (by transport, past form)': 'važiavo',
        'to be late': 'vėluoti',
        'she is late': 'ji vėluoja',
        'to be late (past form)': 'vėlavo',
        'together': 'kartu',
        'morning': 'rytas',
        'day': 'diena',
        'evening': 'vakaras',
        'night': 'naktis',
        'p.m.': 'po pietų',
        'a.m. ': 'prieš pietus',
        'today': 'šiandien',
        'tomorrow': 'rytoj',
        'sometimes': 'kartais',
        'seldom': 'retai',
        'often': 'dažnai',
        'always': 'visada',
        'never': 'niekada',
        'everyday': 'kasdien',
        '6.00 (time)': 'šešta valanda',
        '10.00 (time)': 'dešimta valanda',
        '11.00 (time)': 'vienuolikta valanda',
        '15.00 (time)': 'trečia valanda/penkiolikta valanda',
        '24.00 (time)': 'dvylikta valanda/dvidešimt ketvirta valanda'
    },
    'sekmes-4-advanced': {
        'Where do we meet?': 'Kur susitinkame?/Kur mes susitinkame?',
        'When do we meet?': 'Kada susitinkame?/Kada mes susitinkame?',
        'Have a nice weekend': 'Gero savaitgalio',
        'At what time? (hour)': 'Kelintą valandą?',
        'We meet on Saturday at the station': 'Susitinkame šeštadienį stotyje/Mes susitinkame šeštadienį stotyje',
        '(We meet) Tomorrow morning at 9:30': 'Rytoj rytą pusę dešimtos',
        '(We meet) Tomorrow evening at 7:00': 'Rytoj vakare septintą valandą',
        'It is 3:00 now': 'Dabar yra trečia valanda',
        'I go (by transport) to airport': 'Aš važiuoju į oro uostą',
        'I\'m listening (phone)': 'Klausau/Aš klausau',
        'I invite you tomorrow': 'kviečiu rytoj į svečius',
        'I will definitely come (in response to invitation)': 'Būtinai ateisiu',
        'Let\'s go to Jonas tomorrow afternoon': 'Einame rytoj po pietų pas Joną',
        'We go together': 'Einame kartu/Mes einame kartu,',
        'Sorry, we are a little late': 'Atsiprašau, mes truputį vėluojame',
        'He goes (by transport) from Kaunas to Vilnius': 'Jis važiuoja iš Kauno į Vilnių',
        'Tomorrow I go (by transport) to Estonia': 'Rytoj aš važiuoju į Estiją',
        '(I go) to station': 'į stotį',
        '(I go) to Panevėžys': 'į Panevėžį',
        '(I go) to cafe': 'į kavinę',
        '(I go) to Trakai': 'į Trakus',
        '(I go) to Santariškės': 'į Santariškes',
        'We go home': 'Mes einame namo'
    },
    'sekmes-5-basic': {
        'family': 'šeima',
        'parents': 'tėvai',
        'father': 'tėvas/tėtis',
        'mother': 'motina/mama',
        'child': 'vaikas',
        'daughter': 'duktė',
        'son': 'sūnus',
        'wife': 'žmona',
        'husband': 'vyras',
        'sister': 'sesuo',
        'brother': 'brolis',
        'grandfather': 'senelis',
        'grandmother': 'senelė/močiutė',
        'grandson': 'anūkas',
        'granddaughter': 'anūkė',
        'relatives': 'giminės',
        'aunt': 'teta',
        'uncle': 'dėdė',
        'cousin (man)': 'pusbrolis',
        'cousin (woman)': 'pusseserė',
        'niece': 'dukterėčia',
        'nephew': 'sūnėnas',
        'married man': 'vedęs',
        'married woman': 'ištekėjusi',
        'divorced (man)': 'išsiskyręs',
        'divorced (woman)': 'išsiskyrusi',
        'deceased (man)': 'miręs',
        'deceased (woman)': 'mirusi',
        'person (human)': 'žmogus',
        'man': 'vyras',
        'woman': 'moteris',
        'young man': 'vaikinas',
        'young woman': 'mergina',
        'boy': 'berniukas',
        'girl': 'mergaitė',
        'schoolboy': 'mokinys',
        'schoolgirl': 'mokinė',
        'pet': 'naminis gyvūnas',
        'cat': 'katė',
        'dog': 'šuo',
        'this (male)': 'šis',
        'this (female)': 'ši',
        'these (male, male+female)': 'šie',
        'these (female)': 'šios',
        'music': 'muzika',
        'literature': 'literatūra',
        'sport': 'sportas',
        'theatre': 'teatras',
        'to love': 'mylėti',
        'he loves': 'jis myli',
        'to love (past form)': 'mylėjo',
        'to sit': 'sėdėti',
        'she sits': 'ji sėdi',
        'to sit (past form)': 'sėdėjo',
        'to stand': 'stovėti',
        'he stands': 'jis stovi',
        'to stand (past form)': 'stovėjo',
        'to have': 'turėti',
        'she has': 'ji turi',
        'to have (past form)': 'turėjo',
        'to look': 'žiūrėti',
        'he looks': 'jis žiūri',
        'to look (past form)': 'žiūrėjo',
        'to like': 'mėgti',
        'she likes': 'ji mėgsta',
        'to like (past form)': 'mėgo',
        'to do sports': 'sportuoti',
        'he does sports': 'jis sportuoja',
        'to do sports (past form)': 'sportavo',
        'to walk': 'vaikščioti',
        'she walks': 'ji vaikščioja',
        'to walk (past form)': 'vaikščiojo'
    },
    'sekmes-5-advanced': {
        'Do you have brother?': 'Ar tu turi brolį?/Ar jūs turite brolį?',
        'I have two brothers': 'Aš turiu du brolius',
        'Does he have sister?': 'Ar jis turi seserį?',
        'We have two sisters': 'Mes turime dvi seseris',
        'They don\'t have brother': 'Jie neturi brolio/Jos neturi brolio',
        'I don\'t have sister': 'Aš neturiu sesers',
        'This boy is my son': 'Šis berniukas yra mano sūnus',
        'This girl is my daughter': 'Ši mergaitė yra mano duktė',
        'We have two daughters': 'Mes turime dvi dukteris',
        'We like opera very much': 'Mes labai mėgstame operą',
        'In the evening I watch movie': 'Aš vakare žiūriu filmą',
        'He has a cat and a dog': 'Jis turi katę ir šunį',
        'She doesn\'t have a cat': 'Ji neturi katės',
        'We don\'t have a dog': 'Mes neturime šuns',
        'I don\'t have a son': 'Aš neturiu sūnaus',
        'Four children': 'Keturi vaikai',
        'Five brothers': 'Penki broliai',
        'Three pupils': 'Trys mokiniai',
        'Four aunts': 'Keturios tetos',
        'Three girls': 'Trys mergaitės',
        'Six sons': 'Šeši sūnūs',
        'Six daughters': 'Šešios dukterys',
        'I have four friends': 'Aš turiu keturis draugus',
        'I have twenty three pupils': 'Aš turiu dvidešimt tris mokinius',
        'I have three aunts': 'Aš turiu tris tetas',
        'I have four granddaughters': 'Aš turiu keturias anūkes',
        'I have five sons': 'Aš turiu penkis sūnus'
    },
    'sekmes-6-basic': {
        'tall': 'aukštas/aukšta',
        'friendly': 'draugiškas/draugiška',
        'kind (good)': 'geras/gera',
        'young': 'jaunas/jauna',
        'cheerful': 'linksmas/linksma',
        'sad': 'liūdnas/liūdna',
        'small (little)': 'mažas/maža',
        'dear': 'mielas/miela',
        'smart': 'protingas/protinga',
        'old': 'senas/sena',
        'short (low)': 'žemas/žema',
        'beautiful (pretty)': 'gražus/graži',
        'interesting': 'įdomus/įdomi',
        'nice': 'malonus/maloni',
        'excellent': 'puikus/puiki',
        'blond (light)': 'šviesus/šviesi',
        'dark': 'tamsus/tamsi',
        'big': 'didelis/didelė',
        'middle': 'vidurinis/vidurinė',
        'younger': 'jaunesnis/jaunesnė',
        'youngest': 'jauniausias/jauniausia',
        'elder': 'vyresnis/vyresnė',
        'eldest': 'vyriausias/vyriausia',
        'that (male)': 'tas',
        'that (female)': 'ta',
        'those (male, male+female)': 'tie',
        'those (female)': 'tos'
    },
    'sekmes-6-advanced': {
        'His family is big': 'Jo šeima yra didelė',
        'Her brother is that tall boy': 'Jos brolis yra tas aukštas berniukas',
        'Whose child is that boy?': 'Kieno vaikas yra tas berniukas?',
        'Our sister is very cheerful and friendly': 'Mūsų sesuo labai linksma ir draugiška/Mūsų sesuo yra labai linksma ir draugiška',
        'What is your brother like?': 'Koks tavo brolis?',
        'What is your sister like?': 'Kokia tavo sesuo?',
        'What are your brothers like?': 'Kokie tavo broliai?',
        'What are your sisters like?': 'Kokios tavo seserys?',
        'Kind brothers': 'Geri broliai',
        'Kind mothers ': 'Geros mamos',
        'Beautiful children': 'Gražūs vaikai',
        'Beautiful sisters': 'Gražios seserys',
        'Middle children': 'Viduriniai vaikai',
        'Big girls': 'Didelės mergaitės',
        'Big boys': 'Dideli berniukai',
        'I am the eldest child in the family': 'Aš esu vyriausias vaikas šeimoje',
        'Is your brother younger than you?': 'Ar tavo brolis yra jaunesnis už tave?/Ar tavo brolis jaunesnis už tave?',
        'My sister is older than me': 'Mano sesuo yra vyresnė už mane',
        'Their children live in Vilnius': 'Jų vaikai gyvena Vilniuje',
        'Their names are Rūta and Rasa': 'Jų vardai yra Rūta ir Rasa'
    },
    'sekmes-7-basic': {
        'dairy products': 'pieno produktai',
        'milk': 'pienas',
        'sour cream': 'grietinė',
        'yogurt': 'jogurtas',
        'kefir': 'kefyras',
        'cheese': 'sūris',
        'butter': 'sviestas',
        'curd (quark)': 'varškė',
        'brown bread': 'juoda duona',
        'white bread': 'šviesi duona',
        'long loaf': 'batonas',
        'meat': 'mėsa',
        'beef': 'jautiena',
        'turkey': 'kalakutiena',
        'pork': 'kiauliena',
        'chicken (food)': 'vištiena',
        'sausage (e.g. salami)': 'dešra',
        'sausages (e.g. hot dog)': 'dešrelės',
        'ham': 'kumpis',
        'fish': 'žuvis',
        'drinks': 'gėrimai',
        'water': 'vanduo',
        'juice': 'sultys',
        'tea': 'arbata',
        'coffee': 'kava',
        'kvass': 'gira',
        'sweets': 'saldumynai',
        'bun': 'bandelė',
        'honey': 'medus',
        'pie': 'pyragas',
        'chocolate': 'šokoladas',
        'doughnut': 'spurga',
        'cake': 'tortas/pyragas',
        'porridge': 'košė',
        'egg': 'kiaušinis',
        'sandwich': 'sumuštinis',
        'breakfast': 'pusryčiai',
        'lunch': 'pietūs',
        'supper': 'vakarienė',
        'hungry': 'alkanas/alkana',
        'full': 'sotus/soti',
        'delicious': 'skanus/skani',
        'warm': 'šiltas/šilta',
        'cold': 'šaltas/šalta',
        'hot': 'karštas/karšta',
        'baked (roast, fried, grilled)': 'keptas/kepta',
        'boiled (cooked)': 'virtas/virta',
        'black': 'juodas/juoda',
        'to like': 'mėgti/patikti',
        'he likes': 'jis mėgsta/jam patinka',
        'to like (past form)': 'mėgo/patiko',
        'to want': 'norėti',
        'she wants': 'ji nori',
        'to want (past form)': 'norėjo',
        'to eat': 'valgyti',
        'he eats': 'jis valgo',
        'to eat (past form)': 'valgė',
        'to drink': 'gerti',
        'she drinks': 'ji geria',
        'to drink (past form)': 'gėrė',
        'to taste': 'ragauti',
        'he tastes': 'jis ragauja',
        'to taste (past form)': 'ragavo',
        'to take': 'imti',
        'she takes': 'ji ima',
        'to take (past form)': 'ėmė',
        'to pass': 'paduoti',
        'he passes': 'jis paduoda',
        'to pass (past form)': 'padavė',
        'to put': 'įdėti',
        'she put': 'ji įdeda',
        'to put (past form)': 'įdėjo',
        'to pour': 'įpilti',
        'he pours': 'jis įpila',
        'to pour (past form)': 'įpylė',
        'to have breakfast': 'pusryčiauti',
        'she has breakfast': 'ji pusryčiauja',
        'to have breakfast (past form)': 'pusryčiavo',
        'to have lunch': 'pietauti',
        'he has lunch': 'jis pietauja',
        'to have lunch (past form)': 'pietavo',
        'to have supper': 'vakarieniauti',
        'she has supper': 'ji vakarieniauja',
        'to have supper (past form)': 'vakarieniavo'
    },
    'sekmes-7-advanced': {
        'I eat': 'aš valgau',
        'you (singular) eat': 'tu valgai',
        'he eats': 'jis valgo',
        'we eat': 'mes valgome',
        'you (plural) eat': 'jūs valgote',
        'they eat': 'jie valgo',
        'I drink milk': 'Aš geriu pieną',
        'I don\'t drink milk': 'Aš negeriu pieno',
        'I eat honey': 'Aš valgau medų',
        'I don\'t eat honey': 'Aš nevalgau medaus',
        'I don\'t eat fish': 'Aš nevalgau žuvies',
        'I don\'t eat sandwich': 'Aš nevalgau sumuštinio',
        'I drink water': 'Aš geriu vandenį',
        'I don\'t drink water': 'Aš negeriu vandens',
        '(You, singular, imperative) look': 'žiūrėk',
        '(You, plural, imperative) look': 'žiūrėkite',
        '(We, imperative) look': 'žiūrėkime',
        '(Imperative) Let\'s watch': 'tegu žiūri',
        'The cake is very tasty': '(Tortas|Pyragas) [yra] labai skanus',
        'Please pass the cake (entire)': 'Prašom paduoti tortą',
        'Please pass the cake (some piece of)': 'Prašom paduoti torto',
        'Andrius, taste some cake!': 'Andriau, ragauk pyrago!',
        'Children, eat cake and drink tea!': 'Vaikai, valgykite (torto|pyrago) ir gerkite arbatos!',
        'Do you (singular) like pie? (using patinka)': 'Ar tau patinka pyragas?',
        'Do you (plural) like sandwiches? (using patinka)': 'Ar jums patinka sumuštiniai?',
        'I like chocolate very much (using patinka)': 'Man labai patinka šokoladas',
        'We like sweets (using patinka)': 'Mums patinka saldumynai',
        'He likes coffee (using patinka)': 'Jam patinka kava',
        'She likes tea (using patinka)': 'Jai patinka arbata',
        'They (boys) like beef (using patinka)': 'Jiems patinka jautiena',
        'They (girls) like chicken (using patinka)': 'Joms patinka vištiena',
        'What do you (singular) want? Coffee or tea?': 'Ko tu nori? Kavos ar arbatos?',
        'Some more coffee?': 'Gal dar kavos?',
        'Some water?': 'Gal vandens?',
        'Do you (singular) want some coffee?': 'Gal nori kavos?',
        'Do you (plural) want some coffee?': 'Gal norite kavos?',
        'Put some meat': 'Įdėk mėsos/Įdėkite mėsos',
        'Please, pour some water ': 'Prašom įpilti vandens',
        'Enjoy (your meal)!': 'Skanaus!/Gero apetito!',
        'Thanks, (it) was very tasty': 'Ačiū, buvo labai skanu!',
        'Glad to hear!': 'Malonu girdėti!',
        'Please, take seats': 'Prašom sėstis!',
        'Please, come to the table': 'Prašom prie stalo!',
        'I\'m not hungry': 'Aš (nealkanas|nealkana)/Aš nesu (alkanas|alkana)',
        'Your pie is always very tasty': '(Tavo|Jūsų) pyragas [yra] visada labai skanus!',
        'Please, take some more meat': 'Prašom dar (imti|imkite|imk) mėsos/Prašom (imti|imkite|imk) dar mėsos',
        'I\'m already full': 'Aš (jau esu|esu jau) sotus.',
        '(Do you like bread?) - Not really': 'Nelabai',
        'Pass me some bread': '(Paduok|Paduokite) man duonos'
    },
    'sekmes-8-basic': {
        'market': 'turgus',
        'seller': 'pardavėjas/pardavėja',
        'piece (food)': 'gabaliukas/gabalėlis',
        'kilo': 'kilogramas',
        'bag': 'maišelis',
        'price': 'kaina',
        'euro': 'euras',
        'cent': 'centas',
        'vegetables': 'daržovės',
        'cucumber': 'agurkas',
        'aubergine': 'baklažanas',
        'beetroot': 'burokėlis',
        'potato': 'bulvė',
        'courgette': 'cukinija',
        'garlic': 'česnakas',
        'cabbage': 'kopūstas',
        'pumpkin': 'moliūgas',
        'carrot': 'morka',
        'tomato': 'pomidoras',
        'beans': 'pupelės',
        'onion': 'svogūnas',
        'peas': 'žirniai',
        'fruit': 'vaisiai',
        'orange (fruit)': 'apelsinas',
        'banana': 'bananas',
        'lemon': 'citrina',
        'pear': 'kriaušė',
        'apple': 'obuolys',
        'berries': 'uogos',
        'raspberries': 'avietės',
        'strawberries': 'braškės',
        'currants': 'serbentai',
        'grapes': 'vynuogės',
        'cherries': 'vyšnios',
        'nuts': 'riešutai',
        'spice': 'prieskoniai',
        'basil': 'bazilikai',
        'caraway seeds': 'kmynai',
        'dill': 'krapai',
        'bay leaves': 'lauro lapai',
        'mint': 'mėtos',
        'parsley': 'petražolės',
        'pepper': 'pipirai',
        'oregano': 'raudonėliai',
        'soup': 'sriuba',
        'salad': 'salotos',
        'sweet (adjective)': 'saldus/saldi',
        'sour (adjective)': 'rūgštus/rūgšti',
        'fresh': 'šviežias/šviežia',
        'not fresh (one word)': 'senas/sena',
        'fatty': 'riebus/riebi',
        'smoked': 'rūkytas/rūkyta',
        'raw (unbaked)': 'žalias/žalia',
        'white': 'baltas/balta',
        'yellow': 'geltonas/geltona',
        'blue': 'mėlynas/mėlyna',
        'red': 'raudonas/raudona',
        'green': 'žalias/žalia',
        'to make': 'daryti',
        'he makes': 'jis daro',
        'to make (past form)': 'darė',
        'to fry': 'kepti',
        'she fries': 'ji kepa',
        'to fry (past form)': 'kepė',
        'to boil': 'virti',
        'he boils': 'jis verda',
        'to boil (past form)': 'virė',
        'to give': 'duoti',
        'she gives': 'ji duoda',
        'to give (past form)': 'davė',
        'to buy': 'pirkti',
        'he buys': 'jis perka',
        'to buy (past form)': 'pirko'
    },
    'sekmes-8-advanced': {
        'I will go': 'aš eisiu',
        'you (singular) will go': 'tu eisi',
        'he will go': 'jis eis',
        'we will go': 'mes eisime',
        'you (plural) will go': 'jūs eisite',
        'they will go': 'jie eis/jos eis',
        'What will you buy?': 'Ką [jūs] pirksite?/Ką [tu] pirksi?',
        'What else would you like?': 'Ko dar [jūs] norėtumėte?',
        'Maybe you need a bag?': 'Gal reikia maišelio?',
        'Anything else?': 'Dar ko nors?',
        'How much does a kilo cost?': 'Kiek kainuoja kilogramas?',
        'the day after tomorrow': 'poryt',
        'next sunday': 'kitą sekmadienį',
        'next week': 'kitą savaitę',
        'next month': 'kitą mėnesį',
        'Please give (me) tomatoes': '(Prašom|Prašau) (duoti|duokite) [man] pomidorų',
        'Please give (me) beetroots': '(Prašom|Prašau) (duoti|duokite) [man] burokėlių',
        'Please give (me) apples': '(Prašom|Prašau) (duoti|duokite) [man] obuolių',
        'Please give (me) carrots': '(Prašom|Prašau) (duoti|duokite) [man] morkų',
        'Please give (me) strawberries': '(Prašom|Prašau) (duoti|duokite) [man] braškių',
        'Please give (me) fruits': '(Prašom|Prašau) (duoti|duokite) [man] vaisių',
        'Please give (me) two tomatoes': '(Prašom|Prašau) (duoti|duokite) [man] du pomidorus',
        'Please give (me) two beetroots': '(Prašom|Prašau) (duoti|duokite) [man] du burokėlius',
        'Please give (me) two apples': '(Prašom|Prašau) (duoti|duokite) [man] du obuolius',
        'Please give (me) two carrots': '(Prašom|Prašau) (duoti|duokite) [man] dvi morkas',
        'Please give (me) two strawberries': '(Prašom|Prašau) (duoti|duokite) [man] dvi braškes',
        'Please give (me) two fruits': '(Prašom|Prašau) (duoti|duokite) [man] du vaisius',
        '31 eur': 'trisdešimt vienas euras',
        '5 eur': 'penki eurai',
        '11 eur': 'vienuolika eurų',
        '10 eur': 'dešimt eurų',
        '22 eur': 'dvidešimt du eurai',
        '2 eur': 'du eurai',
        '20 eur': 'dvidešimt eurų'
    },
    'sekmes-9-basic': {
        'cafe': 'kavinė',
        'bakery': 'kepyklėlė',
        'restaurant': 'restoranas',
        'bar': 'baras',
        'pizzeria': 'picerija',
        'waiter': 'padavėjas/padavėja',
        'menu': 'meniu',
        'lunch of the day': 'dienos pietūs',
        'table (small)': 'staliukas',
        'bill': 'sąskaita',
        'usually': 'paprastai',
        'dish': 'patiekalas',
        'vegetable soup': 'daržovių sriuba',
        'mushroom soup': 'grybų sriuba',
        'tomato salad': 'pomidorų salotos',
        'omelette': 'omletas',
        'fried eggs': 'kiaušinienė',
        'fried eggs with bacon': 'kiaušinienė su šonine',
        'sandwich': 'sumuštinis',
        'steak (roasted meat)': 'kepsnys',
        'potato pancakes': 'bulvių blynai',
        'crepes with jam': 'blyneliai su uogiene',
        'pasta': 'makaronai',
        'rice with vegetables': 'ryžiai su daržovėmis',
        'oat porridge': 'avižinė košė',
        'dessert': 'desertas',
        'ice cream': 'ledai',
        'vinegar': 'actas',
        'oil': 'aliejus',
        'sugar': 'cukrus',
        'salt': 'druska',
        'mustard': 'garstyčios',
        'horseradish': 'krienai',
        'mayonnaise': 'majonezas',
        'sauce': 'padažas',
        'jam': 'uogienė',
        'drink': 'gėrimas',
        'food': 'maistas',
        'still water': 'negazuotas vanduo',
        'fruit tea': 'vaisinė arbata',
        'apple juice': 'obuolių sultys',
        'gluten free': 'be glitimo',
        'Coffee and snacks to take away': 'Kava ir užkandžiai išsinešti',
        'Reserved': 'Rezervuota',
        'Lactose free': 'Be laktozės',
        'spicy': 'aštrus/aštri',
        'mild (delicate, about taste)': 'švelnus/švelni',
        'salty': 'sūrus/sūri',
        'cold beetroot soup': 'šaltibarščiai',
    },
    'sekmes-9-advanced': {
        'I would like tea with lemon': 'Norėčiau arbatos su citrina',
        'Do you have freshly squeezed orange juice?': 'Ar [jūs] turite šviežiai spaustų apelsinų sulčių?',
        'What is the cake with?': 'Su kuo yra (pyragas|tortas)?',
        'Do you have a salad without garlic and without onions?': 'Ar [jūs] turite salotų be česnakų ir be svogūnų?',
        'Do you have vegan dishes?': 'Ar [jūs] turite veganiškų patiekalų?',
        'Do you still have daily lunch?': 'Ar dar turite dienos pietų?',
        'Please, bill/check': 'Prašom sąskaitą!',
        'Have you chosen yet?': 'Ar jau išsirinkote?',
        'Will you pay in cash or by card?': 'Mokėsite grynaisiais ar kortele?',
        'Is it free here?': 'Ar čia laisva?',
        'It\'s busy/taken here': 'Čia užimta',
        'Please, pancakes with mushroom sauce': 'Prašom (blynų|blynelių) su grybų padažu',
        'Please pack (the food)': 'Prašom supakuoti',
        'Who do you go to the cafe with?': 'Su kuo (tu eini|jūs einate) į kavinę?',
        'Yesterday I ate an egg': 'Vakar aš valgiau kiaušinį',
        'The day before yesterday I had breakfast at a cafe': 'Užvakar aš pusryčiavau kavinėje',
        'Did you drink coffee yesterday evening?': 'Ar tu vakar vakare gėrei (kavą|kavos)?/Ar tu gėrei (kavą|kavos) vakar vakare?',
        'This morning they didn\'t eat anything': 'Šiandien rytą jie nieko nevalgė',
        'Last weekend we ate cake': 'Aną savaitgalį mes valgėme (pyragą|tortą)'
    },
    'sekmes-10-basic': {
        'vehicles': 'transporto priemonės',
        'car': 'automobilis/mašina',
        'car parking lot': 'automobilių stovėjimo aikštelė',
        'bicycle': 'dviratis',
        'kick scooter': 'paspirtukas',
        'bus': 'autobusas',
        'bus station': 'autobusų stotis',
        '(bus) platform': 'aikštelė',
        'train': 'traukinys',
        'fast train': 'greitasis traukinys',
        'railway station': 'geležinkelio stotis',
        '(railway) platform': 'peronas',
        '(railway) track': 'kelias',
        'plane': 'lėktuvas',
        'airport': 'oro uostas',
        'public transport': 'viešasis transportas',
        'fast bus': 'greitasis autobusas',
        'night bus': 'naktinis autobusas',
        'trolleybus': 'troleibusas',
        'bus stop': 'autobusų stotelė',
        'information': 'informacija',
        'timetable': 'tvarkaraštis',
        'ticket': 'bilietas',
        'train ticket': 'traukinio bilietas',
        'electronic ticket': 'elektroninis bilietas',
        'ticket with discount': 'bilietas su nuolaida',
        'round-trip ticket': 'bilietas pirmyn ir atgal/bilietas į abi puses',
        'one-way ticket': 'bilietas į vieną pusę',
        'ticket office': 'bilietų kasa',
        'fast': 'greitas/greita',
        'slow': 'lėtas/lėta',
        'cheap': 'pigus/pigi',
        'expensive': 'brangus/brangi',
        'comfortable': 'patogus/patogi',
        'on the right': 'dešinėje',
        'on the left': 'kairėje',
        'to the right': 'į dešinę',
        'to the left': 'į kairę',
        'to go straight': 'eiti tiesiai',
        'then': 'paskui',
        'how': 'kaip',
        'to get somewhere on foot': 'nueiti',
        'to get somewhere by vehicle': 'nuvažiuoti',
        'to arrive': 'atvažiuoti',
        'to leave': 'išvažiuoti',
        'to turn': 'pasukti',
        'to turn (present form)': 'pasuka',
        'to turn (past form)': 'pasuko',
        'to get on a bus': 'įlipti į autobusą',
        'to get off a bus': 'išlipti iš autobuso',
        'to go by plane': 'skristi',
        'to go by plane (present form)': 'skrenda',
        'to go by plane (past form)': 'skrido',
        'to need': 'reikėti',
        'to need (present form)': 'reikia',
        'to need (past form)': 'reikėjo',
        'to refill (to top up) a card': 'papildyti kortelę',
        'next stop': 'kita stotelė',
    },
    'sekmes-10-advanced': {
        'Passenger control': 'Keleivių kontrolė',
        'Please show the ticket': 'Prašom parodyti bilietą',
        'Please show student document': 'Prašom parodyti studento pažymėjimą',
        'The bus to Vilnius departs from the eleventh platform': 'Autobusas į Vilnių išvyksta iš vienuoliktos aikštelės.',
        'The train from Klaipėda arrives at the third platform on the first track': 'Traukinys iš Klaipėdos atvyksta į trečią peroną pirmą kelią',
        'How to get to the university? (on foot)': 'Kaip nueiti į universitetą',
        'How to get to Egle? (by transport)': 'Kaip nuvažiuoti pas Eglę?',
        'Which bus goes to the station?': 'Koks autobusas važiuoja į stotį?',
        'You need to go straight': '[Tau|Jums] reikia eiti tiesiai',
        'Take (imperative) trolleybus number 19': '(Važiuok|Važiuokite) devynioliktu troleibusu.',
        'Will you get off at the next stop?': 'Ar [jūs] (lipsite|išlipsite) kitoje stotelėje?',
        '(in a bus) I would like to get off': '[Aš] norėčiau išlipti',
        '(letting someone to get off in a bus) I\'ll let you pass': '[Aš] jus praleisiu/[Aš] praleisiu jus',
        'I go to work on foot': 'Į darbą [aš] einu pėsčiomis/[Aš] einu į darbą pėsčiomis',
        'I go to the university by bicycle': 'Į universitetą [aš] važiuoju dviračiu/[Aš] važiuoju į universitetą dviračiu',
        'I go to the shop by car': 'Į parduotuvę [aš] važiuoju (mašina|automobiliu)/[Aš] važiuoju į parduotuvę (mašina|automobiliu)',
        'How much does a ticket to Palanga cost?': 'Kiek kainuoja bilietas į Palangą?',
        'Please top up the card with ten euros': 'Prašom papildyti kortelę dešimt eurų',
    },
    'sekmes-11-basic': {
        'travel, trip, journey': 'kelionė',
        'passenger': 'keleivis/keleivė',
        'driver': 'vairuotojas/vairuotoja',
        'driving licence': 'vairuotojo pažymėjimas',
        'car insurance': 'automobilio draudimas',
        'fee': 'mokestis',
        'month': 'mėnuo',
        'date': 'data',
        'twenty-four hours': 'para',
        'car parts': 'automobilio dalys',
        'car interior (one word)': 'salonas',
        'steering wheel': 'vairas',
        '(car) keys': 'rakteliai',
        'brakes': 'stabdžiai',
        'tyres': 'padangos',
        '(car) wipers': 'valytuvai',
        '(engine) oil/lubricants': 'tepalai',
        'car wash (service)': 'automobilių plovykla',
        'car interior cleaning': 'salono valymas',
        'car washing': 'automobilių plovimas',
        'car service, repair service': 'autoservisas/automobilių taisykla',
        'roadside assistance': 'techninė pagalba kelyje',
        'speed': 'greitis',
        'quickly': 'greitai',
        'allowed': 'galima',
        'prohibited': 'draudžiama',
        'except': 'išskyrus',
        'new': 'naujas/nauja',
        'old': 'senas/sena',
        'clean': 'švarus/švari',
        'paid': 'mokamas/mokama',
        'free (of charge)': 'nemokamas/nemokama',
        'long': 'ilgas/ilga',
        'short': 'trumpas/trumpa',
        'occupied': 'užimtas/užimta',
        'available': 'laisvas/laisva',
        'next': 'kitas/kita',
        'to travel': 'keliauti',
        'to travel (present form)': 'keliauja',
        'to travel (past form)': 'keliavo',
        'to drive': 'vairuoti',
        'to drive (present form)': 'vairuoja',
        'to drive (past form)': 'vairavo',
        'to rent': 'išsinuomoti',
        'to rent (present form)': 'išsinuomoja',
        'to rent (past form)': 'išsinuomojo',
        'to reserve': 'rezervuoti',
        'to reserve (present form)': 'rezervuoja',
        'to reserve (past form)': 'rezervavo',
        'to show': 'parodyti',
        'to show (present form)': 'parodo',
        'to show (past form)': 'parodė',
        'to stop': 'sustoti',
        'to stop (present form)': 'sustoja',
        'to stop (past form)': 'sustojo',
        'to work (to function)': 'veikti',
        'to work (to function, present form)': 'veikia',
        'to work (to function, past form)': 'veikė',
        'to be out of order (to break down)': 'sugesti',
        'to be out of order (to break down, present form)': 'sugenda',
        'to be out of order (to break down, past form)': 'sugedo',
        'to repair (to fix)': 'pataisyti/suremontuoti',
        'to repair (to fix, present form)': 'pataiso/suremontuoja',
        'to repair (to fix, past form)': 'pataisė/suremontavo',
        'to wash up': 'nuplauti',
        'to wash up (present form)': 'nuplauna',
        'to wash up (past form)': 'nuplovė',
        'to clean up': 'išvalyti',
        'to clean up (present form)': 'išvalo',
        'to clean up (past form)': 'išvalė',
        'to refuel': 'pilti',
        'to refuel (present form)': 'pila',
        'to refuel (past form)': 'pylė',
        'rental point/office': 'nuomos punktas',
        'short-term rental': 'trumpalaikė nuoma',
        'long-term rental': 'ilgalaikė nuoma',
        'car rental': 'automobilių nuoma',
        '(car) pickup location': 'paėmimo vieta',
        '(car) return location': 'grąžinimo vieta',
        '(car) reservation date': 'rezervacijos data',
        'gas/petrol station': 'degalinė',
        'fuel': 'degalai/kuras',
        'petrol': 'benzinas',
        'diesel': 'dyzelinas',
        '(fuel) gas': 'dujos',
        '(at gas station) fuel dispenser': 'kolonėlė',
        'air': 'oras',
        'entrance (for cars)': 'Įvažiavimas',
        'exit (for cars)': 'Išvažiavimas'
    },
    'sekmes-11-advanced': {
        'self-service car wash': 'savitarnos plovykla',
        'we work around the clock (24 hours)': '[Mes] dirbame visą parą',
        'free parking': 'Nemokama automobilių stovėjimo aikštelė',
        'Traffic is prohibited, except bicycles': 'Eismas draudžiamas, išskyrus dviračius',
        'Traffic is restricted on Pilies street': 'Eismas ribojamas Pilies gatvėje',
        'Do not exceed the speed limit': 'Neviršykite leistino greičio',
        'Rental price from 25 euros per day': 'Nuomos kaina nuo 25 eurų parai',
        'Car reservation by phone': 'Automobilio rezervacija telefonu',
        'After work, I’m going to the car wash': 'Po darbo [aš] važiuoju į plovyklą',
        'We will fix the car in an hour': 'Mašiną [mes] pataisysime po valandos/[Mes] Pataisysime mašiną po valandos',
        'I will go to the seaside in a month': 'Prie jūros važiuosiu po mėnesio',
        'Come back in two weeks': '(Atvažiuokite|Atvažiuok) po dviejų savaičių',
        'I’ll be in ten minutes': 'Būsiu po penkiolikos minučių',
        'What is the car rental price per hour?': 'Kokia automobilio nuomos kaina valandai?',
        'I would like to rent a car for four weeks': 'Norėčiau išsinuomoti automobilį keturioms savaitėms',
        'I would like to rent a car for a month': 'Norėčiau išsinuomoti automobilį mėnesiui',
    },
    'sekmes-12-basic': {
        'house': 'namas',
        'home': 'namai',
        'flat': 'butas',
        'stairwell': 'laiptinė',
        'stairs': 'laiptai',
        'floor (in a building, e.g. 2nd floor)': 'aukštas',
        'lift': 'liftas',
        'balcony': 'balkonas',
        'garage': 'garažas',
        'yard (courtyard)': 'kiemas',
        'gates': 'vartai',
        'door': 'durys',
        'door code': 'durų kodas',
        'key': 'raktas',
        'window': 'langas',
        'wall': 'siena',
        'ceiling': 'lubos',
        'floor': 'grindys',
        'rug (carpet)': 'kilimas',
        'room': 'kambarys',
        'kitchen': 'virtuvė',
        'living room': 'svetainė',
        'corridor': 'koridorius',
        'bathroom': 'vonia',
        'shower': 'dušas',
        'toilet (WC)': 'tualetas',
        'bedroom': 'miegamasis',
        'cellar': 'rūsys',
        'furniture': 'baldai',
        'table': 'stalas',
        'chair': 'kėdė',
        'bed': 'lova',
        'sofa (couch)': 'sofa',
        'armchair': 'fotelis',
        'wardrobe (closet)': 'spinta',
        'shelf': 'lentyna',
        'on': 'ant',
        'cosy': 'jaukus/jauki',
        'calm (quiet)': 'ramus/rami',
        'noisy': 'triukšmingas/triukšminga',
        'soft': 'minkštas/minkšta',
        'comfortable': 'patogus/patogi',
        'to pay (completely)': 'sumokėti',
        'to pay (completely, present form)': 'sumoka',
        'to pay (completely, past form)': 'sumokėjo',
        'to close': 'uždaryti',
        'to close (present form)': 'uždaro',
        'to close (past form)': 'uždarė',
        'to open': 'atidaryti',
        'to open (present form)': 'atidaro',
        'to open (past form)': 'atidarė',
        'to lock': 'užrakinti',
        'to lock (present form)': 'užrakina',
        'to lock (past form)': 'užrakino',
        'to unlock': 'atrakinti',
        'to unlock (present form)': 'atrakina',
        'to unlock (past form)': 'atrakino',
        'to rent (smth to smb)': 'nuomoti',
        'to rent (smth to smb, present form)': 'nuomoja',
        'to rent (smth to smb, past form)': 'nuomojo',
        'to rent (smth from)': 'išsinuomoti',
        'to rent (smth from, present form)': 'išsinuomoja',
        'to rent (smth from, past form)': 'išsinuomojo',
        'to need': 'reikėti',
        'to need (present form)': 'reikia',
        'to need (past form)': 'reikėjo',
        'to look for': 'ieškoti',
        'to look for (present form)': 'ieško',
        'to look for (past form)': 'ieškojo',
        'to sit': 'sėdėti',
        'to sit (present form)': 'sėdi',
        'to sit (past form)': 'sėdėjo',
        'to lie down': 'gulėti',
        'to lie down (present form)': 'guli',
        'to lie down (past form)': 'gulėjo',
        'to sleep': 'miegoti',
        'to sleep (present form)': 'miega',
        'to sleep (past form)': 'miegojo'
    },
    'sekmes-12-advanced': {
        'payments/charges for water, electricity, gas': 'mokestis už vandenį, elektrą, dujas',
        'short-term rental of apartments': 'trumpalaikė butų nuoma',
        'a house for rent with furniture and household appliances': 'nuomojamas namas su baldais ir buitine technika',
        'furniture online': 'baldai internetu',
        'Are you renting out a room? (landlord)': 'Ar [jūs] nuomojate kambarį?',
        'I would like to rent an apartment': '[Aš] norėčiau išsinuomoti butą',
        'I invite you to visit this weekend': 'Kviečiu [tave|jūs] savaitgalį į svečius',
        'What floor do you live on?': 'Kelintame aukšte (tu gyveni|jūs gyvenate)?',
        'Please come in': 'Prašom užeiti',
        'Please sit down': 'Prašom (atsisėsti|sėstis|prisėsti)',
        'What a big house!': 'Koks didelis namas!',
        'What a big living room!': 'Kokia didelė svetainė!',
        'Please close the door': 'Prašom uždaryti duris',
        'I would ask (you) to open the window': 'Prašyčiau [jūs] atidaryti langą',
        'It’s dark, (we) need to turn on the light': 'Tamsu, reikia įjungti šviesą',
        'There is internet at home': 'Namuose [yra] internetas/Internetas [yra] namuose',
        'The book is on the table': 'Knyga yra ant stalo',
        'The cat is sleeping on the floor': 'Katė miega ant grindų',
        'We are looking for a beautiful apartment': '[Mes] ieškome gražaus buto',
        'I need a big table': 'Man reikia didelio stalo',
    },
    'sekmes-13-basic': {
        'household appliances': 'buitinė technika',
        'refrigerator': 'šaldytuvas',
        'oven': 'orkaitė',
        'stove': 'viryklė',
        'microwave oven': 'mikrobangų krosnelė',
        'dishwasher': 'indaplovė',
        'washing machine': 'skalbyklė',
        'dryer machine': 'džiovyklė',
        'kettle': 'virdulys',
        'coffee maker': 'kavos aparatas',
        'vacuum cleaner': 'dulkių siurblys',
        'iron': 'lygintuvas',
        'items': 'daiktai',
        'TV': 'televizorius',
        'lamp': 'lempa',
        'mirror': 'veidrodis',
        'picture': 'paveikslas',
        'flower': 'gėlė',
        'rug (carpet)': 'kilimas',
        'dishes': 'indai',
        'rubbish bin': 'šiukšlių dėžė',
        'rubbish': 'šiukšlės',
        'dust': 'dulkės',
        'dirt': 'purvas',
        'cleaning': 'valymas',
        'house cleaner': 'namų tvarkytojas/namų tvarkytoja',
        'from': 'nuo',
        'under': 'po',
        'light': 'šviesa',
        'pipe (tube)': 'vamzdis',
        'tap': 'čiaupas',
        'emergency service': 'avarinė tarnyba',
        'repair': 'remontas',
        'handyman (handywoman)': 'meistras/meistrė',
        'plumber': 'santechnikas/santechnikė',
        'neighbour': 'kaimynas/kaimynė',
        'clean': 'švarus/švari',
        'dirty (unclean)': 'nešvarus/nešvari',
        'tidy': 'tvarkingas/tvarkinga',
        'to tidy (<infinitive form> <present form> <past form>)': 'tvarkyti tvarko tvarkė',
        'to clean, to wipe (<infinitive form> <present form> <past form>)': 'valyti valo valė',
        'to wash up (<infinitive form> <present form> <past form>)': 'išplauti išplauna išplovė',
        'to vacuum (<infinitive form> <present form> <past form>)': 'išsiurbti išsiurbia išsiurbė',
        'to switch on (<infinitive form> <present form> <past form>)': 'įjungti įjungia įjungė',
        'to swich off (<infinitive form> <present form> <past form>)': 'išjungti išjungia išjungė',
        'to work, to function (<infinitive form> <present form> <past form>)': 'veikti veikia veikė',
        'to break down (to malfunction) (<infinitive form> <present form> <past form>)': 'sugesti sugenda sugedo',
        'to burst (to snap) (<infinitive form> <present form> <past form>)': 'trūkti trūksta trūko',
        'to fix, to repair (<infinitive form> <present form> <past form>)': 'pataisyti pataiso pataisė'
    },
    'sekmes-13-advanced': {
        'Refrigerator broke': 'Sugedo šaldytuvas/Šaldytuvas sugedo',
        'Pipe bursted, water is running in the bathroom': 'Trūko vamzdis, vonioje bėga vanduo',
        'What is the emergency service number?': 'Koks [yra] avarinės tarnybos (telefonas|telefono numeris)?',
        'There is no hot water': 'Nėra karšto vandens/Karšto vandens nėra',
        'The computer is not working': 'Neveikia kompiuteris/Kompiuteris neveikia',
        '(We) need a master': 'Reikia meistro',
        '(We) need to call a master': 'Reikia iškviesti meistrą',
        'Wait for the master tomorrow': 'Laukite meistro rytoj/Rytoj laukite meistro',
        'The master will be in fifteen minutes': 'Meistras bus po penkiolikos minučių',
        'Could you tidy up the apartment?': '(Ar|Gal) galėtumėte sutvarkyti butą?',
        'How much does house cleaning cost?': 'Kiek kainuoja namo valymas?',
        'The room should be vacuumed and the floor should be washed': 'Reikėtų išsiurbti kambarį ir išplauti grindis',
        'Please clean the dust off the shelves': 'Prašom nuvalyti dulkes nuo lentynų',
        'Please vacuum under the closet': 'Prašom išsiurbti po spinta',
        'Thank you for tidying up the apartment!': 'Ačiū, kad sutvarkėte butą!',
        'The kitchen needs to be tidied up': 'Reikia sutvarkyti virtuvę',
        'the windows should be cleaned': 'Reikėtų išvalyti langus',


    }

}