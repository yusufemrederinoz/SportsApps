import argparse

from . import export, merge, report


def main():
    parser = argparse.ArgumentParser(prog="pipeline")
    commands = parser.add_subparsers(dest="command", required=True)
    build = commands.add_parser("build")
    build.add_argument("--refresh", action="store_true")
    arguments = parser.parse_args()

    dataset = merge.build(refresh=arguments.refresh)
    database_path = export.write(dataset)
    report_path = report.write(dataset)
    print(f"database: {database_path}")
    print(f"report: {report_path}")


if __name__ == "__main__":
    main()
