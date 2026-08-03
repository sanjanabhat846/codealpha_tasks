import io
import requests
from PIL import Image

def test_api_integration():
  url = "http://127.0.0.1:5000/api/health"
  print(f"[Testing] Checking health endpoint: {url}")
  try:
    r = requests.get(url, timeout=5)
    print("Health Status Code:", r.status_code)
    print("Health Payload:", r.json())
    assert r.status_code == 200
  except Exception as e:
    print("[Error] Health check failed:", e)
    return False

  # Test image detection
  img_url = "http://127.0.0.1:5000/api/detect/image"
  print(f"[Testing] Testing image detection endpoint: {img_url}")
  
  # Create a simple synthetic RGB test image
  img = Image.new('RGB', (640, 480), color=(73, 109, 137))
  img_byte_arr = io.BytesIO()
  img.save(img_byte_arr, format='JPEG')
  img_byte_arr.seek(0)

  files = {'file': ('test_image.jpg', img_byte_arr, 'image/jpeg')}
  try:
    r = requests.post(img_url, files=files, timeout=10)
    print("Detect Image Status Code:", r.status_code)
    res_json = r.json()
    print("Detect Image Success:", res_json.get('success'))
    print("Object Count:", res_json.get('object_count'))
    assert r.status_code == 200
    assert res_json.get('success') is True
    print("[PASS] Integration test passed!")
    return True
  except Exception as e:
    print("[Error] Image detection API failed:", e)
    return False

if __name__ == '__main__':
  test_api_integration()
