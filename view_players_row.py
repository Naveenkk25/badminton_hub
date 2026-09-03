import re

with open('/Users/naveen/Documents/badminton_hub/src/BadmintonHub.Client/Components/Pages/Players.razor', 'r') as f:
    content = f.read()

# I want to extract the RowTemplate block
row_start = content.find('<RowTemplate>')
row_end = content.find('</RowTemplate>') + len('</RowTemplate>')

print(content[row_start:row_end])
