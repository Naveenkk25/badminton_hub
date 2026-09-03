import requests
import json

base_url = "http://localhost:5182/api/v1"

# 1. Login
login_data = {
    "mobileNumber": "1234567890",
    "password": "Admin123!"
}
res = requests.post(f"{base_url}/Auth/login", json=login_data)
if res.status_code != 200:
    print("Login failed:", res.status_code, res.text)
    exit(1)

token = res.json()["token"]

# 2. Create Organizer
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
org_data = {
    "name": "Test Club",
    "contactNumber": "9876543210",
    "initialCredits": 10
}
res_org = requests.post(f"{base_url}/Organizers", json=org_data, headers=headers)
print("Create Organizer Status:", res_org.status_code)
print("Create Organizer Response:", res_org.text)
