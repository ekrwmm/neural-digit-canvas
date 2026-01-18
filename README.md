# MNIST Çizim ve Tahmin

28x28 çizim alanında rakam çizip, sinir ağı katmanlarını görselleştiren ve 0-9 arası tahmin yüzdeleri gösteren web uygulaması.

## Özellikler
- 28x28 grid üzerinde serbest çizim
- Nöral ağ katman görselleştirmesi
- 0-9 arası olasılık dağılımı
- Otomatik ön‑işleme (kırpma, merkezleme, normalize)
- İlk açılışta hızlı eğitim, sonrasında IndexedDB’den hızlı yükleme

## Kurulum
npm install## Çalıştırma
npm run dev## Kullanım
1. Çizim alanına rakam çizin.
2. “Tahmin Et” butonuna basın.
3. Sağ panelde olasılıkları inceleyin.

## Teknik Notlar
- İlk çalıştırmada model kısa bir eğitim yapar ve sonuçları IndexedDB’ye kaydeder.
- Sonraki açılışlarda model doğrudan cache’den yüklenir.
- MNIST veri dosyaları ilk eğitim sırasında internetten alınır.



## Lisans
MIT
