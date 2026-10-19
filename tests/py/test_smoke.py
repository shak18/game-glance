import glancelibrary


def test_package_imports():
    assert glancelibrary.__doc__.startswith("Glance Library")
