function showPDFData(index) {
    var pdfData = data[index];
    var container = document.getElementById('pdfDataContainer');
    container.innerHTML = '';

    var pdfNameHeader = document.getElementById('pdfNameHeader');
    var quizNameInput = document.getElementById('quizName');
    if (pdfData.length > 0) {
        pdfNameHeader.textContent = pdfData[0].Filename;
        quizNameInput.value = pdfData[0].Filename;
    } else {
        quizNameInput.value = '';
    }

    pdfData.forEach(function (qa, index) {
        var questionDiv = document.createElement('div');
        questionDiv.classList.add('question');
        questionDiv.innerHTML = `
                <div>
                    <b class="editable-question" contenteditable="false">${qa.question}</b>
                </div>
                <div class="choices"></div>`;

        var choicesContainer = questionDiv.querySelector('.choices');

        ['a', 'b', 'c', 'd'].forEach(function (choice) {
            if (qa['choice ' + choice]) {
                var choiceDiv = document.createElement('div');
                choiceDiv.classList.add('choice');
                choiceDiv.innerHTML = `
                        <span class="choice-label">${choice.toUpperCase()})</span>
                        <span class="editable-choice" contenteditable="false">${qa['choice ' + choice]}</span>
                        <button id="delete-choice" onclick="deleteChoice(this)">❌</button>`;
                choicesContainer.appendChild(choiceDiv);
            }
        });

        (function (currentIndex) {
            var editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.id = 'editButton' + currentIndex;
            editButton.onclick = function () { editQuestion(currentIndex); };
            questionDiv.appendChild(editButton);

            var saveButton = document.createElement('button');
            saveButton.textContent = 'Save';
            saveButton.id = 'saveButton' + currentIndex;
            saveButton.style.display = 'none';
            saveButton.onclick = function () { saveQuestion(currentIndex); };
            questionDiv.appendChild(saveButton);
        })(index);

        var addButton = document.createElement('button');
        addButton.textContent = 'Add Choice';
        addButton.onclick = function () { addChoice(questionDiv); };
        questionDiv.appendChild(addButton);
        
        var deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete Question';
        deleteButton.classList.add('delete-question');
        deleteButton.setAttribute('data-index', index);
        deleteButton.onclick = function () { deleteQuestion(this); };
        deleteButton.style.color = 'white';
        deleteButton.style.backgroundColor = 'red';
        questionDiv.appendChild(deleteButton)

        if (qa.Answer) {
            var answerDiv = document.createElement('div');
            answerDiv.classList.add('answer');
            answerDiv.textContent = `Answer: ${qa.Answer}`;
            questionDiv.appendChild(answerDiv);
        }

        container.appendChild(questionDiv);
    });

    document.getElementById('currentIndex').textContent = index + 1;
}

function editQuestion(index, newContent) {
    var editButton = document.getElementById('editButton' + index);
    var saveButton = document.getElementById('saveButton' + index);

    editButton.style.display = 'none';
    saveButton.style.display = 'inline';

    var questionDiv = document.querySelectorAll('.question')[index];
    var editableElements = questionDiv.querySelectorAll('.editable-question, .editable-choice');
    editableElements.forEach(function (el) {
        el.contentEditable = 'true';
    });
    edits[index] = newContent;
}

function saveQuestion(index) {
    var questionDiv = document.querySelectorAll('.question')[index];
    var question = questionDiv.querySelector('.editable-question').textContent;
    var choices = Array.from(questionDiv.querySelectorAll('.editable-choice')).map(function (el) {
        return el.textContent;
    });

    edits[index] = {
        question: question,
        choices: choices
    };

    console.log('Saving question:', question);
    console.log('Saving choices:', choices);

    var editButton = document.getElementById('editButton' + index);
    var saveButton = document.getElementById('saveButton' + index);

    editButton.style.display = 'inline';
    saveButton.style.display = 'none';

    var questionDiv = document.querySelectorAll('.question')[index];
    var editableElements = questionDiv.querySelectorAll('.editable-question, .editable-choice');
    editableElements.forEach(function (el) {
        el.contentEditable = 'false';
    });
}

function addChoice(questionDiv) {
    var choicesContainer = questionDiv.querySelector('.choices');
    var newChoiceIndex = choicesContainer.children.length;
    var choiceLabel = String.fromCharCode('A'.charCodeAt(0) + newChoiceIndex);

    var choiceDiv = document.createElement('div');
    choiceDiv.classList.add('choice');
    choiceDiv.innerHTML = `
            <span class="choice-label">${choiceLabel})</span>
            <span class="editable-choice" contenteditable="true">New Choice</span>
            <button id="delete-choice" onclick="deleteChoice(this)">❌</button>`;

    choicesContainer.appendChild(choiceDiv);
}

function deleteQuestion(deleteButton) {
    var index = parseInt(deleteButton.getAttribute('data-index'));
    data[currentIndex].splice(index, 1);
    showPDFData(currentIndex);
}

function deleteChoice(deleteButton) {
    var choiceDiv = deleteButton.parentElement;
    var questionDiv = choiceDiv.closest('.question');
    var questionIndex = Array.from(document.querySelectorAll('.question')).indexOf(questionDiv);
    var choiceIndex = Array.from(questionDiv.querySelectorAll('.choice')).indexOf(choiceDiv);

    if (!deletions.choices[questionIndex]) {
        deletions.choices[questionIndex] = [];
    }
    deletions.choices[questionIndex].push(choiceIndex);

    choiceDiv.remove();
}

function nextPDF() {
    if (currentIndex < data.length - 1) {
        currentIndex++;
        showPDFData(currentIndex);
    }
}

function prevPDF() {
    if (currentIndex > 0) {
        currentIndex--;
        showPDFData(currentIndex);
    }
}

function compactChoices(question) {
    const choiceKeys = ['choice a', 'choice b', 'choice c', 'choice d'];
    let compactedChoices = choiceKeys
        .map(key => question[key])
        .filter(choice => choice !== undefined && choice.trim() !== '');
    while (compactedChoices.length < 4) {
        compactedChoices.push('');
    }
    return compactedChoices.reduce((obj, choice, index) => {
        obj[choiceKeys[index]] = choice;
        return obj;
    }, {});
}

function importToSupabase() {
    var currentPDFData = data[currentIndex];
    var modifiedData = JSON.parse(JSON.stringify(currentPDFData));

    Object.keys(edits).forEach(function (index) {
        var edit = edits[index];
        if (modifiedData[index]) {
            modifiedData[index].question = edit.question;
            ['a', 'b', 'c', 'd'].forEach(function (choice, idx) {
                if (edit.choices[idx]) {
                    modifiedData[index]['choice ' + choice] = edit.choices[idx];
                }
            });
        }
    });

    deletions.choices.forEach((questionDeletions, questionIndex) => {
        if (questionDeletions && modifiedData[questionIndex]) {
            questionDeletions.sort((a, b) => b - a);
            questionDeletions.forEach(choiceIndex => {
                const choiceKeys = ['choice a', 'choice b', 'choice c', 'choice d'];
                if (choiceIndex < choiceKeys.length) {
                    delete modifiedData[questionIndex][choiceKeys[choiceIndex]];
                }
            });
        }
    });

    for (let i = 0; i < modifiedData.length; i++) {
        if (edits[i]) {
            for (const prop in edits[i]) {
                modifiedData[i][prop] = edits[i][prop];
            }
        }
    }

    for (let i = deletions.questions.length - 1; i >= 0; i--) {
        const deletionIndex = deletions.questions[i];
        if (deletionIndex < modifiedData.length) {
            modifiedData.splice(deletionIndex, 1);
        }
    }

    additions.forEach(addition => {
        if (addition.pdfIndex === currentIndex) {
            modifiedData.push(addition);
        }
    });

    var quizName = document.getElementById('quizName').value;
    var examName = document.getElementById('examName').value;

    modifiedData.forEach((question, index) => {
        modifiedData[index] = {
            ...question,
            ...compactChoices(question)
        };
    });

    fetch('/import-to-supabase', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            data: modifiedData,
            quizName: quizName,
            examName: examName
        })
    })
        .then(response => response.json())
        .then(responseData => {
            console.log('Success:', responseData);
            showAlert('Import Successful');
        })
        .catch((error) => {
            console.error('Error:', error);
            showAlert('Import Unsuccessful');
        });
}

function showAlert(message) {
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('customAlert').style.display = 'block';
}

function closeAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

window.onload = function () {
    showPDFData(currentIndex);
};