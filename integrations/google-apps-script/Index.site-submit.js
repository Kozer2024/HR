// В существующем Index.html замените блок с IMGBB_API_KEY и обработчик submit
// на этот вариант. Остальную разметку и стили можно оставить без изменений.

form.addEventListener('submit', function(e) {
  e.preventDefault();
  if (parseFloat(floorInput.value) < 0) {
    status.innerHTML = '<span class="error">Ошибка: Этаж не может быть отрицательным!</span>';
    return;
  }
  if (!selectedFile) {
    status.innerHTML = '<span class="error">Сделайте фото места</span>';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Загрузка на сайт...';
  status.innerHTML = 'Подготовка фотографии...';

  const reader = new FileReader();
  reader.onload = function() {
    const finalData = {
      type: typeSelect.value,
      corpus: document.getElementById('corpus').value,
      floor: floorInput.value,
      description: document.getElementById('description').value,
      kafedra: document.getElementById('kafedra').value || '—',
      photoBase64: reader.result
    };

    status.innerHTML = 'Сохранение точки на сайте...';
    google.script.run
      .withSuccessHandler(function(response) {
        if (!response || response.success === false) {
          status.innerHTML = '<span class="error">' + ((response && response.message) || 'Ошибка сохранения') + '</span>';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Сохранить на сайте';
          return;
        }
        status.innerHTML = '<span class="success">' + response.message + '</span>';
        submitBtn.classList.add('hidden');
        addMoreBtn.classList.remove('hidden');
      })
      .withFailureHandler(function(error) {
        status.innerHTML = '<span class="error">Ошибка сохранения: ' + error.message + '</span>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить на сайте';
      })
      .processForm(finalData);
  };
  reader.readAsDataURL(selectedFile);
});
