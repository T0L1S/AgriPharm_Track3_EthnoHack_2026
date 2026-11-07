'''THIS IS A FILE TO VALIDATE INPUT IT IS NOT IMPORTANT TO THE PROJECT'''
'''CORE ENGINE IS model.py'''

import csv
import math
import os
#months in sown_from, sown_to, drought_start and drought_end start from 0
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

PLANT_COLUMNS = ["plant", "yield_kg", "cycle", "weight", "sown_from", "sown_to"]
DROUGHT_COLUMNS = ["drought", "drought_start", "drought_end"]


class InputError(ValueError):
	"""An input file is missing or holds invalid data."""


#---- reading: these only check that each cell can be read; ranges are checked in validate_inputs

def _number(value, where):
	if value is None or value == "":
		raise InputError(f"{where}: value is empty")
	try:
		number = float(value)
	except ValueError:
		raise InputError(f"{where}: '{value}' is not a number") from None
	if not math.isfinite(number):
		raise InputError(f"{where}: '{value}' is not a finite number")
	return number


def _integer(value, where):
	number = _number(value, where)
	if not number.is_integer():
		raise InputError(f"{where}: '{value}' must be a whole number")
	return int(number)


def _read_rows(folder, filename, required):
	path = os.path.join(folder, filename)
	if not os.path.isfile(path):
		raise InputError(f"{path}: file not found")

	with open(path, newline="", encoding="utf-8-sig") as f:
		reader = csv.DictReader(f)
		if reader.fieldnames is None:
			raise InputError(f"{filename}: file is empty")
		reader.fieldnames = [name.strip() for name in reader.fieldnames]

		duplicates = sorted({name for name in reader.fieldnames if reader.fieldnames.count(name) > 1})
		if duplicates:
			raise InputError(f"{filename}: column(s) appear more than once: {', '.join(duplicates)}")
		missing = [name for name in required if name not in reader.fieldnames]
		if missing:
			raise InputError(f"{filename}: missing column(s): {', '.join(missing)}")

		rows = []
		for row in reader:
			where = f"{filename} line {reader.line_num}"
			if None in row:
				raise InputError(f"{where}: more values than columns")
			row = {key: (value or "").strip() for key, value in row.items()}
			if not any(row.values()):
				continue		#skip blank rows, e.g. empty rows left at the end of an Excel sheet
			rows.append((where, row))
	return rows


def _plant_name(row, where):
	if row["plant"] == "":
		raise InputError(f"{where}: plant name is empty")
	return row["plant"]


def _load_plants(folder):
	plants = {}							#read the data for the plants
	cycle = {}
	for where, row in _read_rows(folder, "data.csv", PLANT_COLUMNS):
		name = _plant_name(row, where)
		if name in plants:
			raise InputError(f"{where}: plant '{name}' appears more than once")
		plants[name] = {}
		for key, value in row.items():
			if (key == "plant"):
				continue
			elif (key == "cycle"):
				cycle[name] = _integer(value, f"{where}, column '{key}'")
			elif (key in PLANT_COLUMNS):
				plants[name][key] = _number(value, f"{where}, column '{key}'")
			else:
				#extra columns are kept: numbers as float, anything else (e.g. a latin name) as text
				try:
					plants[name][key] = float(value)
				except ValueError:
					plants[name][key] = value
	return plants, cycle


def _load_constraints(folder):
	rows = _read_rows(folder, "constraints.csv", ["land"])
	if len(rows) != 1:
		raise InputError(f"constraints.csv: expected exactly one row of values, found {len(rows)}")
	where, row = rows[0]
	constraints = {}					#open to add more constraints, currently land and drought
	for key, value in row.items():
		constraints[key] = _number(value, f"{where}, column '{key}'")
	return constraints


def _load_demand(folder):
	demand = {}							#demand in kg
	for where, row in _read_rows(folder, "demand.csv", ["plant"] + MONTHS):
		name = _plant_name(row, where)
		if name in demand:
			raise InputError(f"{where}: plant '{name}' appears more than once")
		#read by month name, so the column order does not matter and extra columns are ignored
		demand[name] = [_number(row[month], f"{where}, column '{month}'") for month in MONTHS]
	return demand


def _load_init_stock(folder, plants):
	init_stock = {p: 0 for p in plants}
	if not os.path.isfile(os.path.join(folder, "init_stock.csv")):
		return init_stock				#the file is optional: no file means no starting stock
	seen = set()
	for where, row in _read_rows(folder, "init_stock.csv", ["plant", "stock"]):
		name = _plant_name(row, where)
		if name in seen:
			raise InputError(f"{where}: plant '{name}' appears more than once")
		seen.add(name)
		init_stock[name] = _number(row["stock"], f"{where}, column 'stock'")
	return init_stock


#---- checking the values

def _is_month(value):
	return float(value).is_integer() and 0 <= value <= 11


def validate_inputs(plants, cycle, constraints, demand, init_stock):
	"""Check that the input values make sense. Raises InputError listing every problem found.
	Works on the dicts directly, so it can also check data built in code (e.g. in tests)."""
	problems = []

	if not plants:
		problems.append("data.csv: no plants found")

	for p in plants:
		if p not in cycle:
			problems.append(f"data.csv, plant '{p}': cycle is missing")
		elif not isinstance(cycle[p], int) or cycle[p] < 1:
			problems.append(f"data.csv, plant '{p}': cycle must be a whole number of months, at least 1 (got {cycle[p]})")

		for key in PLANT_COLUMNS[1:]:
			if key != "cycle" and key not in plants[p]:
				problems.append(f"data.csv, plant '{p}': {key} is missing")
		for key in ("yield_kg", "weight"):
			if key in plants[p] and plants[p][key] < 0:
				problems.append(f"data.csv, plant '{p}': {key} must not be negative (got {plants[p][key]:g})")
		for key in ("sown_from", "sown_to"):
			if key in plants[p] and not _is_month(plants[p][key]):
				problems.append(f"data.csv, plant '{p}': {key} = {plants[p][key]:g} is not a month (0-based: Jan = 0 ... Dec = 11)")

	if "land" not in constraints:
		problems.append("constraints.csv: land is missing")
	elif constraints["land"] < 0:
		problems.append(f"constraints.csv: land must not be negative (got {constraints['land']:g})")

	present = [c for c in DROUGHT_COLUMNS if c in constraints]
	if present and len(present) < len(DROUGHT_COLUMNS):
		missing = [c for c in DROUGHT_COLUMNS if c not in constraints]
		problems.append(f"constraints.csv: the drought scenario needs {', '.join(DROUGHT_COLUMNS)}; missing {', '.join(missing)}")
	elif present:
		if not 0 <= constraints["drought"] <= 1:
			problems.append(f"constraints.csv: drought is the share of the harvest kept in a drought, so it must be between 0 and 1 (got {constraints['drought']:g})")
		for key in ("drought_start", "drought_end"):
			if not _is_month(constraints[key]):
				problems.append(f"constraints.csv: {key} = {constraints[key]:g} is not a month (0-based: Jan = 0 ... Dec = 11)")
		start, end = constraints["drought_start"], constraints["drought_end"]
		if _is_month(start) and _is_month(end) and start > end:
			problems.append(f"constraints.csv: drought_start ({start:g}) is after drought_end ({end:g}); droughts that cross the new year are not supported")

	for p in plants:
		if p not in demand:
			problems.append(f"demand.csv: no row for plant '{p}' (it is in data.csv)")
	for p in demand:
		if p not in plants:
			problems.append(f"demand.csv: plant '{p}' is not in data.csv")
		elif len(demand[p]) != 12:
			problems.append(f"demand.csv, plant '{p}': expected 12 months, got {len(demand[p])}")
		else:
			negative = [MONTHS[i] for i, value in enumerate(demand[p]) if value < 0]
			if negative:
				problems.append(f"demand.csv, plant '{p}': negative demand in {', '.join(negative)}")

	for p in plants:
		if p not in init_stock:
			problems.append(f"init_stock: no value for plant '{p}'")
	for p, stock in init_stock.items():
		if p not in plants:
			problems.append(f"init_stock.csv: plant '{p}' is not in data.csv")
		elif stock < 0:
			problems.append(f"init_stock.csv, plant '{p}': stock must not be negative (got {stock:g})")

	if problems:
		raise InputError(f"{len(problems)} problem(s) in the input:\n" + "\n".join(f"  - {msg}" for msg in problems))


def load_inputs(folder="."):
	"""Read and check data.csv, constraints.csv, demand.csv and the optional init_stock.csv in folder.
	Returns plants, cycle, constraints, demand, init_stock. Raises InputError if anything is wrong."""
	plants, cycle = _load_plants(folder)
	constraints = _load_constraints(folder)
	demand = _load_demand(folder)
	init_stock = _load_init_stock(folder, plants)
	validate_inputs(plants, cycle, constraints, demand, init_stock)
	return plants, cycle, constraints, demand, init_stock
